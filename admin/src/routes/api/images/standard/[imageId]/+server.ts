import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { standardImageData } from '$lib/server/dbcache';

export const GET = (async ({ params }) => {
	const image = standardImageData.find((image) => {
		return image.id === params.imageId && image.visibility === true;
	});
	if (image === undefined) {
		return json({ success: false, message: 'Image cannot be found' }, { status: 400 });
	}
	return json({ success: true, data: image });
}) satisfies RequestHandler;
