import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { attemptLogin, isSessionValid } from '$lib/server/auth';

export const load = (async ({ cookies }) => {
	if (await isSessionValid(cookies)) {
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
		if (await attemptLogin(cookies, username.toString(), password.toString())) {
			return { success: true };
		}
		return { success: false, message: 'Invalid login' };
	}
} satisfies Actions;
