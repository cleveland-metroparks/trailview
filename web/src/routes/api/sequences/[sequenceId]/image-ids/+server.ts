import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import z from 'zod';
import { isApiAdmin } from '$api/common';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';

export type GetResType = { success: false; message: string } | { success: true; data: string[] };

export const GET = (async ({ params, url, cookies, request }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const paramSequenceId = z.coerce.number().int().safeParse(params.sequenceId);
	if (paramSequenceId.success !== true) {
		return json({ success: false, message: 'Invalid sequence id' } satisfies GetResType, {
			status: 400
		});
	}
	const imageIds = await querySequenceImageIds({
		sequenceId: paramSequenceId.data,
		includePrivate
	});
	return json({ success: true, data: imageIds } satisfies GetResType);
}) satisfies RequestHandler;

async function querySequenceImageIds(params: {
	sequenceId: number;
	includePrivate: boolean;
	limit?: number;
}): Promise<string[]> {
	const imageIdsQueryBase = params.includePrivate
		? db
				.select({ id: schema.image.id })
				.from(schema.image)
				.where(eq(schema.image.sequenceId, params.sequenceId))
		: db
				.select({ id: schema.image.id })
				.from(schema.image)
				.where(and(eq(schema.image.sequenceId, params.sequenceId), eq(schema.image.public, true)));
	const imageIdsQuery =
		params.limit === undefined
			? await imageIdsQueryBase
			: await imageIdsQueryBase.limit(params.limit);
	return imageIdsQuery.map((i) => i.id);
}
