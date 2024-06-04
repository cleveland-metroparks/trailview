import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';

export const DELETE = (async ({ params }) => {
	const sequenceId = parseInt(params.sequenceId);
	if (isNaN(sequenceId)) {
		return json({ success: false, message: 'Invalid sequence id' }, { status: 400 });
	}
	try {
		await db
			.update(schema.sequence)
			.set({ toDelete: true })
			.where(eq(schema.sequence.id, sequenceId));
	} catch (error) {
		console.error(error);
		return json({ success: false }, { status: 500 });
	}
	return json({ success: true });
}) satisfies RequestHandler;
