import { db } from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET = (async () => {
	const sequences = await db.sequence.findMany({
		select: { name: true, id: true, mapsApiTrailId: true }
	});
	return json({ success: true, data: sequences });
}) satisfies RequestHandler;
