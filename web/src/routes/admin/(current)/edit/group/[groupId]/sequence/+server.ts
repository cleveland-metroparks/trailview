import { isSessionValid } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/prisma';

const patchReqType = z.object({
	action: z.union([z.literal('add'), z.literal('remove')]),
	sequenceId: z.number().int()
});
export type PatchReqType = z.infer<typeof patchReqType>;

export const PATCH = (async ({ cookies, request, params }) => {
	if ((await isSessionValid(cookies)) !== true) {
		return json({ success: false, message: 'Invalid session' }, { status: 403 });
	}
	const paramGroupId = parseInt(params.groupId);
	if (isNaN(paramGroupId)) {
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
	const group = await db.group.findUnique({ where: { id: paramGroupId } });
	if (group === null) {
		return json({ success: false, message: 'Invalid group id' }, { status: 400 });
	}
	const sequence = await db.sequence.findUnique({
		where: { id: patch.data.sequenceId },
		include: { images: { select: { id: true } } }
	});
	if (sequence === null) {
		return json({ success: false, message: 'Invalid sequence id' }, { status: 400 });
	}

	if (patch.data.action === 'add') {
		const batchSize = 100;
		const totalBatches = Math.ceil(sequence.images.length / batchSize);
		for (let i = 0; i < totalBatches; i++) {
			const batchImages = sequence.images.slice(i * batchSize, (i + 1) * batchSize);
			await db.group.update({
				where: { id: paramGroupId },
				data: { images: { connect: batchImages.map((i) => ({ id: i.id })) } }
			});
		}
		return json({ success: true });
	} else if (patch.data.action === 'remove') {
		for (const image of sequence.images) {
			await db.$queryRaw`
                    DELETE FROM "_ImageGroupRelation"
                    WHERE "A" = ${paramGroupId} AND "B" = ${image.id}`;
		}
		return json({ success: true });
	}
	return json({ success: false, message: 'Invalid action' }, { status: 400 });
}) satisfies RequestHandler;
