import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { allTileIndex, broadcastGeoJsonRefresh } from '$lib/server/geojson';
import * as vtpbf from 'vt-pbf';
import { isApiAdmin } from '$api/common';

export const GET = (async ({ params, cookies, request }) => {
	if (!(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' }, { status: 403 });
	}
	const z = parseFloat(params.z);
	const x = parseFloat(params.x);
	const y = parseFloat(params.y);
	if (isNaN(z) || isNaN(x) || isNaN(y)) {
		return json({ success: false, message: 'Invalid parameters' }, { status: 400 });
	}
	if (allTileIndex === undefined) {
		await broadcastGeoJsonRefresh();
	}
	if (allTileIndex === undefined) {
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
	const tile = allTileIndex.getTile(z, x, y);

	if (tile !== null) {
		const layer = new vtpbf.GeoJSONWrapper(tile.features);
		layer.name = 'geojsonLayer';
		layer.version = 2;
		const pbfData = vtpbf.fromVectorTileJs({
			layers: {
				geojsonLayer: layer
			}
		});

		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(pbfData);
				controller.close();
			}
		});
		return new Response(stream, {
			headers: { 'Content-Type': 'application/vnd.mapbox-vector-tile' }
		});
	} else {
		return new Response(null);
	}
}) satisfies RequestHandler;