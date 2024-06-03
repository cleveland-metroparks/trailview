import type { Feature, FeatureCollection } from 'geojson';
import geojsonvt from 'geojson-vt';
import { allImageData, groupData, refreshImageData, standardImageData } from './dbcache';

export let allTileIndex: ReturnType<typeof geojsonvt> | undefined;
export let standardTileIndex: ReturnType<typeof geojsonvt> | undefined;

export async function refreshGeoJsonData(once = false) {
	if (groupData === undefined) {
		await refreshImageData(true);
	}
	if (groupData === undefined) {
		console.error('Unable to get group data form cache');
		return;
	}
	if (allImageData !== undefined) {
		const features: FeatureCollection = {
			type: 'FeatureCollection',
			features: []
		};
		for (const image of allImageData) {
			const feature: Feature = {
				type: 'Feature',
				properties: {
					sequenceId: image.sequenceId,
					groupIds: groupData
						.filter((g) => {
							return g.imageId === image.id;
						})
						.map((g) => {
							return g.groupId;
						}),
					imageID: image.id,
					visible: image.public
				},
				geometry: {
					type: 'Point',
					coordinates: [image.longitude, image.latitude]
				}
			};
			features.features.push(feature);
		}
		allTileIndex = geojsonvt(features, {
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
	}
	if (standardImageData !== undefined) {
		const features: FeatureCollection = {
			type: 'FeatureCollection',
			features: []
		};
		for (const image of standardImageData) {
			const feature: Feature = {
				type: 'Feature',
				properties: {
					sequenceId: image.sequenceId,
					groupIds: groupData
						.filter((g) => {
							return g.imageId === image.id;
						})
						.map((g) => {
							return g.groupId;
						}),
					imageID: image.id,
					visible: image.public
				},
				geometry: {
					type: 'Point',
					coordinates: [image.longitude, image.latitude]
				}
			};
			features.features.push(feature);
		}
		standardTileIndex = geojsonvt(features, {
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
	}
	if (once) {
		return;
	} else {
		return new Promise<void>((resolve) => {
			setTimeout(resolve, 1000 * 60); // 1 minute
		});
	}
}

(async () => {
	// eslint-disable-next-line no-constant-condition
	while (true) {
		await refreshGeoJsonData();
	}
})();
