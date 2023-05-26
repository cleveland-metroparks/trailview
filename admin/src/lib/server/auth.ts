import { redirect } from '@sveltejs/kit';
import { db } from './prisma';

export async function isSessionValid(sessionId: string | undefined): Promise<boolean> {
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

export async function redirectIfSessionInvalid(
	url: string,
	sessionId: string | undefined
): Promise<void> {
	if (!(await isSessionValid(sessionId))) {
		throw redirect(301, url);
	}
}
