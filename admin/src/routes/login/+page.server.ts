import { db } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isSessionValid } from '$lib/server/auth';

export const load = (async ({ cookies }) => {
	if (await isSessionValid(cookies.get('session'))) {
		throw redirect(301, '/admin');
	}
}) satisfies PageServerLoad;

export const actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username');
		const password = data.get('password');
		if (!username || !password) {
			return { success: false };
		}
		const user = await db.adminAccount.findUnique({ where: { Username: username.toString() } });
		if (!user) {
			return { success: false, message: 'Invalid login' };
		}
		if (user.Password === password.toString()) {
			const session = await db.session.create({ data: { AdminAccountId: user.Id } });
			cookies.set('session', session.Id, {
				secure: process.env.NODE_ENV === 'development' ? false : true,
				httpOnly: true,
				sameSite: 'strict',
				maxAge: 60 * 60 * 24 // A day
			});
			throw redirect(302, '/admin');
		}
		return { success: false, message: 'Invalid login' };
	}
} satisfies Actions;
