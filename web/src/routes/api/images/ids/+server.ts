import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isApiAdmin } from '$api/common';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';

export type GetResType = { success: false; message: string } | { success: true; data: string[] };

export const GET = (async ({ cookies, request, url }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const imagesQuery = includePrivate
		? await db.select({ id: schema.image.id }).from(schema.image)
		: await db
				.select({ id: schema.image.id })
				.from(schema.image)
				.where(eq(schema.image.public, true));
	return json({ success: true, data: imagesQuery.map((i) => i.id) } satisfies GetResType);
}) satisfies RequestHandler;
