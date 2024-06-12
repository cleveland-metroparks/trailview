import { isApiAdmin } from '$api/common';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

type DeleteResType = { success: false; message: string } | { success: true };

export const DELETE = (async ({ cookies, request, params }) => {
	if ((await isApiAdmin(cookies, request.headers)) !== true) {
		return json({ success: false, message: 'Unauthorized' } satisfies DeleteResType, {
			status: 403
		});
	}
	const paramSequenceId = z.coerce.number().int().safeParse(params.sequenceId);
	if (paramSequenceId.success !== true) {
		return json({ success: false, message: 'Invalid sequence id' } satisfies DeleteResType, {
			status: 400
		});
	}
	await db.delete(schema.sequence).where(eq(schema.sequence.id, paramSequenceId.data));
	return json({ success: true } satisfies DeleteResType);
}) satisfies RequestHandler;
