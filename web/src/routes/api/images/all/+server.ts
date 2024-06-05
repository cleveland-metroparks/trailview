import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import type { ImageData } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData[] };

export const GET = (async () => {
	const imagesQuery = await db
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
		.from(schema.image);
	return json({ success: true, data: imagesQuery } satisfies GetResType);
}) satisfies RequestHandler;
