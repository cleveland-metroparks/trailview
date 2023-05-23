import { db } from '$lib/server/prisma';
import { redirect, type Handle } from '@sveltejs/kit';

async function isSessionValid(sessionId: string | undefined): Promise<boolean> {
	if (sessionId === undefined) {
		return false;
	}
	const session = await db.session.findUnique({ where: { Id: sessionId } });
	if (!session) {
		return false;
	}
	// 24 hours
	if (new Date().valueOf() - session.createdAt.valueOf() > 1000 * 60 * 60 * 24) {
		await db.session.delete({ where: { Id: session.Id } });
		return false;
	}
	return true;
}

export const handle = (async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/login')) {
		if (await isSessionValid(event.cookies.get('session'))) {
			throw redirect(302, '/admin');
		}
	}
	if (event.url.pathname.startsWith('/admin')) {
		if (await isSessionValid(event.cookies.get('session'))) {
			const res = await resolve(event);
			return res;
		} else {
			throw redirect(302, '/login');
		}
	}
	const res = await resolve(event);
	return res;
}) satisfies Handle;
