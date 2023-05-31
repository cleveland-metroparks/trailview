import { redirectIfSessionInvalid } from '$lib/server/auth.js';

export const load = async ({ cookies }) => {
	await redirectIfSessionInvalid('/login', cookies);
};
