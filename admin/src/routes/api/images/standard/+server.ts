import { db } from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET = (async () => {
	const images = await db.image.findMany({
		where: { visibility: true },
		select: {
			id: true,
			sequenceId: true,
			latitude: true,
			longitude: true,
			bearing: true,
			flipped: true,
			pitchCorrection: true,
			visibility: true
		}
	});
	return json({ success: true, data: images });
}) satisfies RequestHandler;
