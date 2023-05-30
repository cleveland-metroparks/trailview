import { db } from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET = (async ({ params }) => {
	const image = await db.image.findUnique({
		where: { id: params.imageId },
		select: { shtHash: true }
	});
	if (!image) {
		return json({ success: false, message: 'Image not found' }, { status: 404 });
	}
	return json({ success: true, data: image.shtHash });
}) satisfies RequestHandler;
