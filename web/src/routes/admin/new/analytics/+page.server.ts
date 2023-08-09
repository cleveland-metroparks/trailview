import { redirectIfSessionInvalid } from '$lib/server/auth';
import { db } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	await redirectIfSessionInvalid('/login', cookies);

	const analytics = await db.analytics.findMany();
	const hitsPerDayMap = new Map<number, number>();
	for (const a of analytics) {
		const count = hitsPerDayMap.get(a.date.valueOf());
		if (count !== undefined) {
			hitsPerDayMap.set(a.date.valueOf(), count + 1);
		} else {
			hitsPerDayMap.set(a.date.valueOf(), 1);
		}
	}
	const hitsPerDay = Array.from(hitsPerDayMap.entries());

	return { hitsPerDay };
}) satisfies PageServerLoad;
