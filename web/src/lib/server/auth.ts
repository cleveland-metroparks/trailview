import { redirect, type Cookies } from '@sveltejs/kit';
import { db } from './prisma';

export const sessionExpireSeconds = 60 * 60 * 24; // A day

export async function deleteExpiredSessions(userId: number) {
	const expirationDate = new Date(new Date().valueOf() - 1000 * sessionExpireSeconds);
	await db.session.deleteMany({
		where: {
			AdminAccountId: userId,
			createdAt: { lt: expirationDate }
		}
	});
}

export async function logout(cookies: Cookies): Promise<boolean> {
	const sessionCookie = cookies.get('session');
	if (sessionCookie === undefined) {
		return false;
	}
	cookies.delete('session', { path: '/admin' });
	try {
		await db.session.delete({ where: { Id: sessionCookie } });
	} catch {
		return false;
	}
	return true;
}

export async function attemptLogin(
	cookies: Cookies,
	username: string,
	password: string
): Promise<boolean> {
	if (username === '' || password === '') {
		return false;
	}
	const user = await db.adminAccount.findUnique({ where: { Username: username.toString() } });
	if (!user) {
		return false;
	}
	deleteExpiredSessions(user.Id);
	if (user.Password === password.toString()) {
		const session = await db.session.create({ data: { AdminAccountId: user.Id } });
		cookies.set('session', session.Id, {
			path: '/admin',
			secure: process.env.NODE_ENV === 'development' ? false : true,
			httpOnly: true,
			sameSite: 'strict',
			maxAge: sessionExpireSeconds
		});
		return true;
	}
	return false;
}

export async function isSessionValid(cookies: Cookies): Promise<boolean> {
	const sesssionCookie = cookies.get('session');
	if (sesssionCookie === undefined) {
		return false;
	}
	const session = await db.session.findUnique({ where: { Id: sesssionCookie } });
	if (!session) {
		return false;
	}
	if (new Date().valueOf() - session.createdAt.valueOf() > 1000 * sessionExpireSeconds) {
		await db.session.delete({ where: { Id: session.Id } });
		return false;
	}
	return true;
}

export async function redirectIfSessionInvalid(url: string, cookies: Cookies): Promise<void> {
	if (!(await isSessionValid(cookies))) {
		throw redirect(301, url);
	}
}
