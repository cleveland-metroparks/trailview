import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { standardImageData } from '$lib/server/dbcache';

export const GET = (async () => {
	return json({ success: true, data: standardImageData });
}) satisfies RequestHandler;
