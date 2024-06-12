import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, eq } from 'drizzle-orm';

export type GetResType = { success: false; message: string } | { success: true; data: string[] };

export async function querySequenceImageIds(params: {
	sequenceId: number;
	includePrivate: boolean;
}): Promise<string[]> {
	const imageIdsQuery = params.includePrivate
		? await db
				.select({ id: schema.image.id })
				.from(schema.image)
				.where(eq(schema.image.sequenceId, params.sequenceId))
		: await db
				.select({ id: schema.image.id })
				.from(schema.image)
				.where(and(eq(schema.image.sequenceId, params.sequenceId), eq(schema.image.public, true)));
	return imageIdsQuery.map((i) => i.id);
}
