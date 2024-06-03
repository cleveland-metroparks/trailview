import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as schema from '$db/schema';

export const GET = (async () => {
	const sequencesQuery = await db
		.select({
			name: schema.sequence.name,
			id: schema.sequence.id,
			mapsApiTrailId: schema.sequence.mapsApiTrailId
		})
		.from(schema.sequence);
	return json({ success: true, data: sequencesQuery });
}) satisfies RequestHandler;
