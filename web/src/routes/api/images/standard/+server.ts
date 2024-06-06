import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';
import { imageQuerySelect, type ImageData } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData[] };

export const GET = (async () => {
	const imagesQuery = await db
		.select(imageQuerySelect)
		.from(schema.image)
		.where(eq(schema.image.public, true));
	return json({ success: true, data: imagesQuery } satisfies GetResType);
}) satisfies RequestHandler;
