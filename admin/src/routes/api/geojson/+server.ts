import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { features } from '$lib/server/geojson';

export const GET = (async () => {
	return json(features);
}) satisfies RequestHandler;
