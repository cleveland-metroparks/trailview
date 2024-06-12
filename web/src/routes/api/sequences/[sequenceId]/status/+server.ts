import { isApiAdmin } from '$api/common';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';

type PatchResType = { success: false; message: string } | { success: true };

export const PATCH: RequestHandler = async ({ request, cookies, params }) => {
	if ((await isApiAdmin(cookies, request.headers)) !== true) {
		return json({ success: false, message: 'Unauthorized' } satisfies PatchResType, {
			status: 403
		});
	}
	const paramSequenceId = z.coerce.number().int().safeParse(params.sequenceId);
	if (paramSequenceId.success !== true) {
		return json({ success: false, message: 'Invalid sequence id' } satisfies PatchResType, {
			status: 400
		});
	}
	const bodySchema = z.object({
		status: z.enum(['upload', 'blur', 'tile', 'sequence', 'done'])
	});
	const bodyParse = bodySchema.safeParse(await request.json());
	if (bodyParse.success !== true) {
		return json({ success: false, message: 'Invalid body' } satisfies PatchResType, {
			status: 400
		});
	}
	const updatedSequence = await db
		.update(schema.sequence)
		.set({ status: bodyParse.data.status })
		.where(eq(schema.sequence.id, paramSequenceId.data))
		.returning();
	if (updatedSequence.length === 0 || updatedSequence.at(0)?.status !== bodyParse.data.status) {
		return json({ success: false, message: 'Failed to update database' } satisfies PatchResType, {
			status: 500
		});
	}
	return json({ success: true } satisfies PatchResType);
};
