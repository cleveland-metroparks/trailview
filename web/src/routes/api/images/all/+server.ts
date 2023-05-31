import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { allImageData } from '$lib/server/dbcache';

export const GET = (async () => {
	return json({ success: true, data: allImageData });
}) satisfies RequestHandler;
