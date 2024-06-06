import CheapRuler from 'cheap-ruler';
import type { ImageData } from '$api/common';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, eq, not, sql } from 'drizzle-orm';

export type Neighbor = ImageData & {
	distance: number;
	neighborBearing: number;
	shtHash: string | undefined;
};

export type GetResType = { success: false; message: string } | { success: true; data: Neighbor[] };

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

export async function getNeighbors(params: {
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
	const filteredNeighbors = neighbors.filter((neighbor) => {
		return neighbor !== null;
	}) as Neighbor[];
	return filteredNeighbors;
}
