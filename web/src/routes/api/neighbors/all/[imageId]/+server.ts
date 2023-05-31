import { allImageData } from '$lib/server/dbcache';
import { json, type RequestHandler } from '@sveltejs/kit';
import { getNeighbors } from '../../common';

export const GET = (async ({ params }) => {
	if (params.imageId === undefined) {
		return json({ success: false, message: 'No imageId specified' }, { status: 400 });
	}
	const neighbors = getNeighbors(allImageData, params.imageId);
	if (neighbors === undefined) {
		return json({ success: false, message: 'Invalid image id' }, { status: 404 });
	}
	return json({ success: true, data: neighbors });
}) satisfies RequestHandler;
