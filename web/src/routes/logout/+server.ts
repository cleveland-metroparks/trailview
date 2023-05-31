import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logout } from '$lib/server/auth';

export const POST = (async ({ cookies }) => {
	return json({ success: await logout(cookies) });
}) satisfies RequestHandler;
