import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, count, eq } from 'drizzle-orm';

const patchReqType = z.object({
	action: z.union([z.literal('addImages'), z.literal('removeImages')]),
	imageIds: z.array(z.string().min(1))
});
export type PatchReqType = z.infer<typeof patchReqType>;

export const PATCH = (async ({ request, params }) => {
	const paramGroupId = parseInt(params.groupId);
	const groupCountQuery = await db
		.select({ count: count() })
		.from(schema.group)
		.where(eq(schema.group.id, paramGroupId));
	if (isNaN(paramGroupId) || groupCountQuery[0].count === 0) {
		return json({ success: false, message: 'Invalid group id' }, { status: 400 });
	}
	let jsonData: unknown;
	try {
		jsonData = await request.json();
	} catch (e) {
		console.error(e);
		return json({ success: false, message: 'Invalid JSON' }, { status: 400 });
	}
	const patch = patchReqType.safeParse(jsonData);
	if (patch.success !== true) {
		return json({ success: false, message: 'Invalid request' }, { status: 400 });
	}
	if (patch.data.action === 'addImages') {
		const batchSize = 100;
		const totalBatches = Math.ceil(patch.data.imageIds.length / batchSize);
		for (let i = 0; i < totalBatches; i++) {
			const batchIds = patch.data.imageIds.slice(i * batchSize, (i + 1) * batchSize);
			await db.insert(schema.imageGroupRelation).values(
				batchIds.map((id) => {
					return { imageId: id, groupId: paramGroupId };
				})
			);
		}
		return json({ success: true });
	} else if (patch.data.action === 'removeImages') {
		for (const id of patch.data.imageIds) {
			await db
				.delete(schema.imageGroupRelation)
				.where(
					and(
						eq(schema.imageGroupRelation.imageId, id),
						eq(schema.imageGroupRelation.groupId, paramGroupId)
					)
				);
		}
		return json({ success: true });
	}
	return json({ success: false, message: 'Invalid action' }, { status: 400 });
}) satisfies RequestHandler;
