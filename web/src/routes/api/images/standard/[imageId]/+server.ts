import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { zodImageId } from '$lib/util';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, eq } from 'drizzle-orm';
import { imageQuerySelect, type ImageData } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData };

export const GET = (async ({ params }) => {
	const imageIdParse = zodImageId.safeParse(params.imageId);
	if (imageIdParse.success !== true) {
		return json({ success: false, message: 'Invalid image id' } satisfies GetResType, {
			status: 400
		});
	}
	const imageQuery = await db
		.select(imageQuerySelect)
		.from(schema.image)
		.where(and(eq(schema.image.id, imageIdParse.data), eq(schema.image.public, true)));
	const image = imageQuery.at(0);
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: image } satisfies GetResType);
}) satisfies RequestHandler;
