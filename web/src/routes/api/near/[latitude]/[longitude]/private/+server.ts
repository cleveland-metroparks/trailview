import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import z from 'zod';
import { queryNearestImage, type GetResType } from '../common';
import { isApiAdmin } from '$api/common';

export const GET = (async ({ params, cookies, request }) => {
	if (!(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 403 });
	}
	const latitudeParse = z.number().safeParse(params.latitude);
	const longitudeParse = z.number().safeParse(params.longitude);
	if (latitudeParse.success !== true || longitudeParse.success !== true) {
		return json({ success: false, message: 'Invalid latitude/longitude' } satisfies GetResType, {
			status: 400
		});
	}
	const nearestImage = await queryNearestImage({
		includePrivate: true,
		coordinates: [longitudeParse.data, latitudeParse.data]
	});
	if (nearestImage === null) {
		return json({ success: false, message: 'No image found' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: nearestImage } satisfies GetResType);
}) satisfies RequestHandler;
