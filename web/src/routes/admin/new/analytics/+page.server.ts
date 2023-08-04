import { redirectIfSessionInvalid } from '$lib/server/auth';
import { db } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	await redirectIfSessionInvalid('/login', cookies);

	const analytics = await db.analytics.findMany({
		include: { image: { select: { sequence: { select: { name: true } } } } }
	});

	return { analytics };
}) satisfies PageServerLoad;
