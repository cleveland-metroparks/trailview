import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';

export type GetResType = { success: false; message: string } | { success: true; data: string[] };

export async function queryImageIds(params: { includePrivate: boolean }): Promise<string[]> {
	const imagesQuery = params.includePrivate
		? await db.select({ id: schema.image.id }).from(schema.image)
		: await db
				.select({ id: schema.image.id })
				.from(schema.image)
				.where(eq(schema.image.public, true));
	return imagesQuery.map((i) => i.id);
}
