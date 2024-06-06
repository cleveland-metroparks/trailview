import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { imageQuerySelect, isApiAdmin } from '$api/common';
import type { GetResType } from '../common';

export const GET = (async ({ cookies, request }) => {
	if (!(await isApiAdmin(cookies, request.headers)) === true) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 403 });
	}
	const imagesQuery = await db.select(imageQuerySelect).from(schema.image);
	return json({ success: true, data: imagesQuery } satisfies GetResType);
}) satisfies RequestHandler;
