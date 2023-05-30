import { db } from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET = (async ({ params }) => {
	const image = await db.image.findUnique({
		where: { id: params.imageId },
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
	if (!image || image.visibility === false) {
		return json({ success: false, message: 'Image cannot be found' }, { status: 400 });
	}
	return json({ success: true, data: image });
}) satisfies RequestHandler;
