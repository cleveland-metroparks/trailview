import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, eq } from 'drizzle-orm';

export type GetResType = { success: false; message: string } | { success: true; data: string[] };

export async function querySequenceImageIds(params: {
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
