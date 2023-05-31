import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { allImageData } from '$lib/server/dbcache';

export const GET = (async ({ params }) => {
	const image = allImageData.find((image) => {
		return image.id === params.imageId;
	});
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' }, { status: 404 });
	}
	return json({ success: true, data: image });
}) satisfies RequestHandler;
