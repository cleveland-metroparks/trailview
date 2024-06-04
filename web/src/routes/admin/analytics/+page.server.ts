import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	const analyticsQuery = await db.select({ date: schema.analytics.date }).from(schema.analytics);
	const hitsPerDayMap = new Map<number, number>();
	for (const a of analyticsQuery) {
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
