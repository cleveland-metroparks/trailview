import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { zodImageId } from '$lib/util';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';
import { imageQuerySelect, isApiAdmin } from '$api/common';
import type { GetResType } from '../common';

export const GET = (async ({ params, cookies, request }) => {
	if (!(await isApiAdmin(cookies, request.headers)) === true) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 403 });
	}
	const imageIdParse = zodImageId.safeParse(params.imageId);
	if (imageIdParse.success !== true) {
		return json({ success: false, message: 'Invalid image id' } satisfies GetResType, {
			status: 400
		});
	}
	const imageQuery = await db
		.select(imageQuerySelect)
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
