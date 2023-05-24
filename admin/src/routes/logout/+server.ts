import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/prisma';

export const POST = (async ({ cookies }) => {
	const sessionCookie = cookies.get('session');
	if (sessionCookie === undefined) {
		return json({ success: false });
	}
	cookies.delete('session');
	try {
		await db.session.delete({ where: { Id: sessionCookie } });
	} catch {
		return json({ success: false });
	}
	return json({ success: true });
}) satisfies RequestHandler;
