import { isSessionValid } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/prisma';

export const DELETE = (async ({ params, cookies }) => {
	if (!isSessionValid(cookies)) {
		return json({ success: false, message: 'Unauthorized' }, { status: 403 });
	}
	const sequenceId = parseInt(params.sequenceId);
	if (isNaN(sequenceId)) {
		return json({ success: false, message: 'Invalid sequence id' }, { status: 400 });
	}
	try {
		await db.sequence.update({ where: { id: sequenceId }, data: { toDelete: true } });
	} catch (error) {
		console.error(error);
		return json({ success: false }, { status: 500 });
	}
	return json({ success: true });
}) satisfies RequestHandler;
