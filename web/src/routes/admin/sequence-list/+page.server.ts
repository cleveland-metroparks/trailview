import { redirectIfSessionInvalid } from '$lib/server/auth.js';
import { db } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	await redirectIfSessionInvalid('/login', cookies);
	const sequences = await db.sequence.findMany();
	return {
		sequences: sequences.sort((a, b) => {
			if (a.name < b.name) {
				return -1;
			}
			if (a.name > b.name) {
				return 1;
			}
			return 0;
		})
	};
}) satisfies PageServerLoad;
