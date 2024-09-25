import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { not, sql } from 'drizzle-orm';
import { zodImageId } from '$lib/util';
import { isApiAdmin, type ImageData } from '$api/common';
import { eq, and } from 'drizzle-orm';
import CheapRuler from 'cheap-ruler';

export type Neighbor = ImageData & {
	distance: number;
	neighborBearing: number;
	shtHash: string | undefined;
};

export type GetResType = { success: false; message: string } | { success: true; data: Neighbor[] };

export const GET = (async ({ url, params, cookies, request }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const searchParamSequencesFilter = url.searchParams.get('s');
	let sequencesFilter: number[] | undefined = undefined;
	if (searchParamSequencesFilter !== null) {
		const filterStrings = searchParamSequencesFilter.split(',');
		sequencesFilter = filterStrings.map((sequenceId) => {
			return parseInt(sequenceId);
		});
	}

	const searchParamGroupsFilter = url.searchParams.get('g');
	let groupsFilter: number[] | undefined = undefined;
	if (searchParamGroupsFilter !== null) {
		const filterStrings = searchParamGroupsFilter.split(',');
		groupsFilter = filterStrings.map((groupId) => {
			return parseInt(groupId);
		});
	}

	if (params.imageId === undefined) {
		return json({ success: false, message: 'No imageId specified' } satisfies GetResType, {
			status: 400
		});
	}

	// Analytics
	const current = new Date();
	const day = new Date(
		current.getFullYear(),
		current.getMonth(),
		current.getDate(),
		current.getHours(),
		0,
		0
	);

	await db
		.insert(schema.analytics)
		.values({ imageId: params.imageId, date: day, count: 1 })
		.onConflictDoUpdate({
			target: [schema.analytics.imageId, schema.analytics.date],
			set: { count: sql`${schema.analytics.count} + 1` }
		});

	const imageIdParse = zodImageId.safeParse(params.imageId);
	if (imageIdParse.success !== true) {
		return json({ success: false, message: 'Invalid image id' } satisfies GetResType, {
			status: 400
		});
	}
	const neighbors = await getNeighbors({
		imageId: imageIdParse.data,
		includePrivate,
		groupsFilter,
		sequencesFilter
	});
	if (neighbors === null) {
		return json({ success: false, message: 'Invalid image id' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: neighbors } satisfies GetResType);
}) satisfies RequestHandler;

const ruler = new CheapRuler(41, 'meters');
const neighborDistCutoff = 10;
const pruneAngle = 25;
const optimalDist = 4;

function customMod(a: number, b: number): number {
	return a - Math.floor(a / b) * b;
}

async function queryImagesInRadius(params: {
	coordinates: [number, number];
	radiusMeters: number;
	excludeImageId: string;
}) {
	return await db
		.select({
			id: schema.image.id,
			coordinates: schema.image.coordinates,
			sequenceId: schema.image.sequenceId,
			bearing: schema.image.bearing,
			flipped: schema.image.flipped,
			pitchCorrection: schema.image.pitchCorrection,
			public: schema.image.public,
			createdAt: schema.image.createdAt,
			shtHash: schema.image.shtHash,
			distance: sql<number>`ST_Distance(coordinates::geography, 
				ST_SETSRID(ST_MakePoint(${params.coordinates[0]}, ${params.coordinates[1]}), 4326)::geography) 
				AS distance`
		})
		.from(schema.image)
		.where(
			and(
				sql`ST_DWithin(coordinates::geography, ST_SetSRID(
				ST_MakePoint(${params.coordinates[0]}, ${params.coordinates[1]}), 4326)::geography, 
				${params.radiusMeters})`,
				not(eq(schema.image.id, params.excludeImageId))
			)
		);
}

async function getNeighbors(params: {
	includePrivate: boolean;
	imageId: string;
	sequencesFilter: number[] | undefined;
	groupsFilter: number[] | undefined;
}): Promise<null | Neighbor[]> {
	const neighbors: (Neighbor | null)[] = [];
	const sourceImageQuery = await db
		.select({
			id: schema.image.id,
			coordinates: schema.image.coordinates,
			bearing: schema.image.bearing
		})
		.from(schema.image)
		.where(eq(schema.image.id, params.imageId));
	const sourceImage = sourceImageQuery.at(0);
	if (sourceImage === undefined) {
		return null;
	}
	const nearbyImages = await queryImagesInRadius({
		coordinates: sourceImage.coordinates,
		radiusMeters: neighborDistCutoff,
		excludeImageId: sourceImage.id
	});

	const groupsQuery = await db
		.select({
			imageId: schema.imageGroupRelation.imageId,
			groupId: schema.imageGroupRelation.groupId
		})
		.from(schema.imageGroupRelation);

	for (const nearImage of nearbyImages) {
		let brng = ruler.bearing(sourceImage.coordinates, nearImage.coordinates);
		if (brng < 0) {
			brng += 360;
		}
		const bearing = customMod(customMod(brng - sourceImage.bearing, 360) + 180, 360);
		let skip = false;
		for (let n = 0; n < neighbors.length; n++) {
			const neighbor = neighbors[n];
			if (neighbor === null) {
				continue;
			}
			const diff = customMod(neighbor.neighborBearing - bearing + 180, 360) - 180;
			if (Math.abs(diff) < pruneAngle) {
				if (
					Math.abs(optimalDist - nearImage.distance) < Math.abs(optimalDist - neighbor.distance)
				) {
					neighbors[n] = null;
				} else {
					skip = true;
				}
			}
		}
		if (skip == false) {
			let filteredBySeq = false;
			if (params.sequencesFilter !== undefined) {
				if (!params.sequencesFilter.includes(nearImage.sequenceId)) {
					filteredBySeq = true;
				}
			}

			let filteredByGroup = params.groupsFilter === undefined ? false : true;
			if (params.groupsFilter !== undefined) {
				for (const g of params.groupsFilter) {
					if (
						groupsQuery.findIndex((r) => {
							return r.groupId === g && r.imageId === nearImage.id;
						}) !== -1
					) {
						filteredByGroup = false;
						break;
					}
				}
			}
			if (
				(params.groupsFilter === undefined && params.sequencesFilter === undefined) ||
				(params.groupsFilter !== undefined && filteredByGroup === false) ||
				(params.sequencesFilter !== undefined && filteredBySeq === false)
			) {
				neighbors.push({
					...nearImage,
					neighborBearing: bearing
				});
			}
		}
	}
	let filteredNeighbors = neighbors.filter((neighbor) => {
		return neighbor !== null;
	}) as Neighbor[];
	if (!params.includePrivate) {
		filteredNeighbors = filteredNeighbors.filter((n) => n.public);
	}
	return filteredNeighbors;
}
