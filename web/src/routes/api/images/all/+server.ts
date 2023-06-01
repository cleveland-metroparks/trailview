import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { allImageData, refreshImageData } from '$lib/server/dbcache';

export const GET = (async () => {
	if (allImageData === undefined) {
		await refreshImageData(true);
	}
	if (allImageData === undefined) {
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
	return json({ success: true, data: allImageData });
}) satisfies RequestHandler;
