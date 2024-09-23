import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';
import { imageQuerySelect, isApiAdmin } from '$api/common';
import { type ImageData } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData[] };

export const GET = (async ({ cookies, request, url }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const imagesQueryBase = db.select(imageQuerySelect).from(schema.image);
	const imagesQuery = includePrivate
		? await imagesQueryBase
		: await imagesQueryBase.where(eq(schema.image.public, true));
	return json({ success: true, data: imagesQuery } satisfies GetResType);
}) satisfies RequestHandler;
