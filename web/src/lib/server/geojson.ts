import type { Feature, FeatureCollection } from 'geojson';
import { db } from './prisma';
import geojsonvt from 'geojson-vt';

const images = await db.image.findMany({
	where: { visibility: true },
	select: {
		id: true,
		sequenceId: true,
		latitude: true,
		longitude: true,
		bearing: true,
		flipped: true,
		pitchCorrection: true,
		visibility: true
	}
});

export const features: FeatureCollection = {
	type: 'FeatureCollection',
	features: []
};

images.forEach((image) => {
	const feature: Feature = {
		type: 'Feature',
		properties: {
			sequenceId: image.sequenceId,
			imageID: image.id,
			visible: image.visibility
		},
		geometry: {
			type: 'Point',
			coordinates: [image.longitude, image.latitude]
		}
	};
	features.features.push(feature);
});

export const tileIndex = geojsonvt(features, {
	maxZoom: 24, // max zoom to preserve detail on; can't be higher than 24
	tolerance: 3, // simplification tolerance (higher means simpler)
	extent: 4096, // tile extent (both width and height)
	buffer: 64, // tile buffer on each side
	debug: 0, // logging level (0 to disable, 1 or 2)
	lineMetrics: false, // whether to enable line metrics tracking for LineString/MultiLineString features
	promoteId: null, // name of a feature property to promote to feature.id. Cannot be used with `generateId`
	generateId: false, // whether to generate feature ids. Cannot be used with `promoteId`
	indexMaxZoom: 5, // max zoom in the initial tile index
	indexMaxPoints: 100000 // max number of points per tile in the index
});
