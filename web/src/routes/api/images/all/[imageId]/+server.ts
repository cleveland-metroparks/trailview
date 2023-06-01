import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { allImageData, imagePreviews, refreshImageData } from '$lib/server/dbcache';

export const GET = (async ({ params }) => {
	if (allImageData === undefined) {
		await refreshImageData(true);
	}
	if (allImageData === undefined) {
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
	const image = allImageData.find((image) => {
		return image.id === params.imageId;
	});
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' }, { status: 404 });
	}
	return json({ success: true, data: image, preview: imagePreviews.get(image.id) });
}) satisfies RequestHandler;
