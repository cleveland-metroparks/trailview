import { isSessionValid } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/prisma';

const patchReqType = z.object({
	action: z.union([z.literal('addImages'), z.literal('removeImages')]),
	imageIds: z.array(z.string().nonempty())
});
export type PatchReqType = z.infer<typeof patchReqType>;

export const PATCH = (async ({ cookies, request, params }) => {
	if ((await isSessionValid(cookies)) !== true) {
		return json({ success: false, message: 'Invalid session' }, { status: 403 });
	}
	const paramGroupId = parseInt(params.groupId);
	if (isNaN(paramGroupId) || (await db.group.count({ where: { id: paramGroupId } })) === 0) {
		return json({ success: false, message: 'Invalid group id' }, { status: 400 });
	}
	let jsonData: unknown;
	try {
		jsonData = await request.json();
	} catch (error) {
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
			await db.group.update({
				where: { id: paramGroupId },
				data: { images: { connect: batchIds.map((id) => ({ id })) } }
			});
		}
		return json({ success: true });
	} else if (patch.data.action === 'removeImages') {
		for (const id of patch.data.imageIds) {
			await db.$queryRaw`
                DELETE FROM "_ImageGroupRelation"
                WHERE "A" = ${paramGroupId} AND "B" = ${id}`;
		}
		return json({ success: true });
	}
	return json({ success: false, message: 'Invalid action' }, { status: 400 });
}) satisfies RequestHandler;
