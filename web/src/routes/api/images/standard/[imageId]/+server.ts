import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { imagePreviews, refreshImageData, standardImageData } from '$lib/server/dbcache';

export const GET = (async ({ params }) => {
	if (standardImageData === undefined) {
		await refreshImageData(true);
	}
	if (standardImageData === undefined) {
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
	const image = standardImageData.find((image) => {
		return image.id === params.imageId && image.public === true;
	});
	if (image === undefined) {
		return json({ success: false, message: 'Image cannot be found' }, { status: 400 });
	}
	return json({ success: true, data: image, preview: imagePreviews.get(image.id) });
}) satisfies RequestHandler;
