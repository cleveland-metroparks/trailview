import { redirect, type Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, eq, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const sessionExpireSeconds = 60 * 60 * 24; // A day

export async function deleteExpiredSessions(userId: number) {
	const expirationDate = new Date(new Date().valueOf() - 1000 * sessionExpireSeconds);
	await db
		.delete(schema.session)
		.where(
			and(eq(schema.session.adminAccountId, userId), lt(schema.session.createdAt, expirationDate))
		);
}

export async function logout(cookies: Cookies): Promise<boolean> {
	const sessionCookie = cookies.get('session');
	if (sessionCookie === undefined) {
		return false;
	}
	cookies.delete('session', { path: '/' });
	try {
		await db.delete(schema.session).where(eq(schema.session.id, sessionCookie));
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
	const userQuery = await db
		.select({ id: schema.adminAccount.id, password: schema.adminAccount.password })
		.from(schema.adminAccount)
		.where(eq(schema.adminAccount.username, username.toString()));
	const user = userQuery.at(0);
	if (user === undefined) {
		return false;
	}
	deleteExpiredSessions(user.id);
	if (user.password === password.toString()) {
		const sessionQuery = await db
			.insert(schema.session)
			.values({ id: uuidv4(), adminAccountId: user.id })
			.returning();
		const session = sessionQuery.at(0);
		if (session === undefined) {
			return false;
		}
		cookies.set('session', session.id, {
			path: '/',
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
	const sessionCookie = cookies.get('session');
	if (sessionCookie === undefined) {
		return false;
	}
	const sessionQuery = await db
		.select()
		.from(schema.session)
		.where(eq(schema.session.id, sessionCookie));
	const session = sessionQuery.at(0);
	if (session === undefined) {
		return false;
	}
	if (new Date().valueOf() - session.createdAt.valueOf() > 1000 * sessionExpireSeconds) {
		await db.delete(schema.session).where(eq(schema.session.id, session.id));
		return false;
	}
	return true;
}

export async function redirectIfSessionInvalid(url: string, cookies: Cookies): Promise<void> {
	if (!(await isSessionValid(cookies))) {
		throw redirect(301, url);
	}
}
