import { redirectIfSessionInvalid } from '$lib/server/auth.js';
import type { PageServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	await redirectIfSessionInvalid('/login', cookies);
}) satisfies PageServerLoad;
