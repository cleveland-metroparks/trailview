import { db, schema } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { isApiAdmin } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: string };

export const GET = (async ({ params, url, cookies, request }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const imageQueryBase = db.select({ shtHash: schema.image.shtHash }).from(schema.image);
	const imageQuery = includePrivate
		? await imageQueryBase.where(eq(schema.image.id, params.imageId))
		: await imageQueryBase.where(
				and(eq(schema.image.id, params.imageId), eq(schema.image.public, true))
			);
	const image = imageQuery.at(0);
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: image.shtHash } satisfies GetResType);
}) satisfies RequestHandler;
