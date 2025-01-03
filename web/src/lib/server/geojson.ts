import type { Feature, FeatureCollection } from 'geojson';
import geojsonvt from 'geojson-vt';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';
import { building } from '$app/environment';

export let allTileIndex: ReturnType<typeof geojsonvt> | undefined;
export let standardTileIndex: ReturnType<typeof geojsonvt> | undefined;

type ImageData = {
	id: string;
	sequenceId: number;
	public: boolean;
	coordinates: [number, number];
};

type GroupRelationData = {
	imageId: string;
	groupId: number;
}[];

function createTiles(images: ImageData[], groups: GroupRelationData) {
	const features: FeatureCollection = {
		type: 'FeatureCollection',
		features: []
	};
	for (const image of images) {
		const feature: Feature = {
			type: 'Feature',
			properties: {
				sequenceId: image.sequenceId,
				groupIds: groups
					.filter((g) => {
						return g.imageId === image.id;
					})
					.map((g) => {
						return g.groupId;
					}),
				imageID: image.id,
				public: image.public
			},
			geometry: {
				type: 'Point',
				coordinates: image.coordinates
			}
		};
		features.features.push(feature);
	}
	return geojsonvt(features, {
		maxZoom: 24, // max zoom to preserve detail on; can't be higher than 24
		tolerance: 100, // simplification tolerance (higher means simpler)
		extent: 4096, // tile extent (both width and height)
		buffer: 64, // tile buffer on each side
		debug: 0, // logging level (0 to disable, 1 or 2)
		lineMetrics: false, // whether to enable line metrics tracking for LineString/MultiLineString features
		promoteId: null, // name of a feature property to promote to feature.id. Cannot be used with `generateId`
		generateId: false, // whether to generate feature ids. Cannot be used with `promoteId`
		indexMaxZoom: 0, // max zoom in the initial tile index
		indexMaxPoints: 4096 // max number of points per tile in the index
	});
}

export async function refreshGeoJsonData() {
	const groupsQuery = await db
		.select({
			imageId: schema.imageGroupRelation.imageId,
			groupId: schema.imageGroupRelation.groupId
		})
		.from(schema.imageGroupRelation);
	const allImagesQuery = await db
		.select({
			id: schema.image.id,
			sequenceId: schema.image.sequenceId,
			public: schema.image.public,
			coordinates: schema.image.coordinates
		})
		.from(schema.image);
	allTileIndex = createTiles(allImagesQuery, groupsQuery);

	const publicImagesQuery = await db
		.select({
			id: schema.image.id,
			sequenceId: schema.image.sequenceId,
			public: schema.image.public,
			coordinates: schema.image.coordinates
		})
		.from(schema.image)
		.where(eq(schema.image.public, true));
	standardTileIndex = createTiles(publicImagesQuery, groupsQuery);
}

let refreshing = false;
(async () => {
	if (building === false && refreshing === false) {
		const refresh = async () => {
			await refreshGeoJsonData();
			setTimeout(refresh, 1000 * 60 * 60 + Math.floor(Math.random() * 1000 * 60 * 10));
		};
		await refresh();
		refreshing = true;
	}
})();
