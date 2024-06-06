import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import z from 'zod';
import type { ImageData } from '$api/common';
import { queryNearestImage } from '../common';

export type GetResType =
	| { success: false; message: string }
	| { success: true; data: ImageData & { distance: number } };

export const GET = (async ({ params }) => {
	const latitudeParse = z.number().safeParse(params.latitude);
	const longitudeParse = z.number().safeParse(params.longitude);
	if (latitudeParse.success !== true || longitudeParse.success !== true) {
		return json({ success: false, message: 'Invalid latitude/longitude' } satisfies GetResType, {
			status: 400
		});
	}
	const nearestImage = await queryNearestImage({
		includePrivate: false,
		coordinates: [longitudeParse.data, latitudeParse.data]
	});
	if (nearestImage === null) {
		return json({ success: false, message: 'No image found' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: nearestImage } satisfies GetResType);
}) satisfies RequestHandler;
