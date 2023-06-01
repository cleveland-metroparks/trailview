import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { refreshImageData, standardImageData } from '$lib/server/dbcache';

export const GET = (async () => {
	if (standardImageData === undefined) {
		await refreshImageData(true);
	}
	if (standardImageData === undefined) {
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
	return json({ success: true, data: standardImageData });
}) satisfies RequestHandler;
