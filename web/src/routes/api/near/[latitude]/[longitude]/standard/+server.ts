import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { refreshImageData, standardImageData } from '$lib/server/dbcache';
import { getNearestImage } from '../common';

export const GET = (async ({ params }) => {
	const latitude = parseFloat(params.latitude);
	const longitude = parseFloat(params.longitude);
	if (isNaN(latitude) || isNaN(longitude)) {
		return json({ success: false, message: 'Invalid location format' }, { status: 400 });
	}
	if (standardImageData === undefined) {
		await refreshImageData(true);
	}
	if (standardImageData === undefined) {
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
	const nearest = await getNearestImage(standardImageData, latitude, longitude);
	if (nearest === undefined) {
		return json({ success: false, message: 'Image not found' }, { status: 404 });
	}
	return json({ success: true, data: nearest });
}) satisfies RequestHandler;
