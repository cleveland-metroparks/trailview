import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, eq } from 'drizzle-orm';

const patchReqType = z.object({
	action: z.union([z.literal('add'), z.literal('remove')]),
	sequenceId: z.number().int()
});
export type PatchReqType = z.infer<typeof patchReqType>;

export const PATCH = (async ({ request, params }) => {
	const paramGroupId = parseInt(params.groupId);
	if (isNaN(paramGroupId)) {
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
	const groupQuery = await db
		.select({})
		.from(schema.group)
		.where(eq(schema.group.id, paramGroupId));
	const group = groupQuery.at(0);
	if (group === undefined) {
		return json({ success: false, message: 'Invalid group id' }, { status: 400 });
	}
	const sequenceQuery = await db
		.select({ id: schema.sequence.id })
		.from(schema.sequence)
		.where(eq(schema.sequence.id, patch.data.sequenceId));
	const sequence = sequenceQuery.at(0);
	if (sequence === undefined) {
		return json({ success: false, message: 'Invalid sequence id' }, { status: 400 });
	}
	const sequenceImagesQuery = await db
		.select({ id: schema.image.id })
		.from(schema.image)
		.where(eq(schema.image.sequenceId, sequence.id));
	if (patch.data.action === 'add') {
		const batchSize = 100;
		const totalBatches = Math.ceil(sequenceImagesQuery.length / batchSize);
		for (let i = 0; i < totalBatches; i++) {
			const batchImages = sequenceImagesQuery.slice(i * batchSize, (i + 1) * batchSize);
			await db
				.insert(schema.imageGroupRelation)
				.values(batchImages.map((image) => ({ imageId: image.id, groupId: paramGroupId })));
		}
		return json({ success: true });
	} else if (patch.data.action === 'remove') {
		for (const image of sequenceImagesQuery) {
			await db
				.delete(schema.imageGroupRelation)
				.where(
					and(
						eq(schema.imageGroupRelation.imageId, image.id),
						eq(schema.imageGroupRelation.groupId, paramGroupId)
					)
				);
		}
		return json({ success: true });
	}
	return json({ success: false, message: 'Invalid action' }, { status: 400 });
}) satisfies RequestHandler;
