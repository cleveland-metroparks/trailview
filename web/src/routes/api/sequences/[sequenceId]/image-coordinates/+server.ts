import { isApiAdmin } from '$api/common';
import { db, schema } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

export type GetResType =
	| { success: false; message: string }
	| { success: true; data: { id: string; coordinates: [number, number] }[] };

export const GET = async ({ cookies, request, params, url }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const sequenceIdParse = z.coerce.number().int().finite().safeParse(params.sequenceId);
	if (!sequenceIdParse.success) {
		return json({ success: false, message: 'Invalid sequence id' } satisfies GetResType, {
			status: 400
		});
	}

	const imagesQueryBase = db
		.select({
			id: schema.image.id,
			coordinates: schema.image.coordinates
		})
		.from(schema.image);
	const imagesQuery = includePrivate
		? await imagesQueryBase.where(eq(schema.image.sequenceId, sequenceIdParse.data))
		: await imagesQueryBase.where(
				and(eq(schema.image.sequenceId, sequenceIdParse.data), eq(schema.image.public, true))
			);
	return json({ success: true, data: imagesQuery } satisfies GetResType);
};
