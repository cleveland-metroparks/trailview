import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { zodImageId } from '$lib/util';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';
import type { ImageData } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData };

export const GET = (async ({ params }) => {
	const imageIdParse = zodImageId.safeParse(params.imageId);
	if (imageIdParse.success !== true) {
		return json({ success: false, message: 'Invalid image id' } satisfies GetResType, {
			status: 400
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
		.where(eq(schema.image.id, imageIdParse.data));
	const image = imageQuery.at(0);
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: image } as GetResType);
}) satisfies RequestHandler;
