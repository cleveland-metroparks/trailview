import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import z from 'zod';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { getNearestImageId } from '../common';
import { eq } from 'drizzle-orm';
import type { ImageData } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData };

export const GET = (async ({ params }) => {
	const latitudeParse = z.number().safeParse(params.latitude);
	const longitudeParse = z.number().safeParse(params.longitude);
	if (latitudeParse.success !== true || longitudeParse.success !== true) {
		return json({ success: false, message: 'Invalid latitude/longitude' } satisfies GetResType, {
			status: 400
		});
	}
	const nearestImageId = await getNearestImageId({
		includePrivate: false,
		latitude: latitudeParse.data,
		longitude: longitudeParse.data
	});
	if (nearestImageId === null) {
		return json({ success: false, message: 'No image found' } satisfies GetResType, {
			status: 404
		});
	}
	const imageQuery = await db
		.select({
			id: schema.image.id,
			sequenceId: schema.image.sequenceId,
			latitude: schema.image.latitude,
			longitude: schema.image.longitude,
			bearing: schema.image.bearing,
			flipped: schema.image.flipped,
			pitchCorrection: schema.image.pitchCorrection,
			public: schema.image.public,
			createdAt: schema.image.createdAt,
			shtHash: schema.image.shtHash
		})
		.from(schema.image)
		.where(eq(schema.image.public, true));
	const image = imageQuery.at(0);
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: image } satisfies GetResType);
}) satisfies RequestHandler;
