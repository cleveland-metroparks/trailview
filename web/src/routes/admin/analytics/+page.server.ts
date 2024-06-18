import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { max, min } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import urlJoin from 'url-join';

export const load: PageServerLoad = async () => {
	const analyticsQuery = await db
		.select({
			minDate: min(schema.analytics.date),
			maxDate: max(schema.analytics.date)
		})
		.from(schema.analytics);
	const row = analyticsQuery.at(0);
	if (row === undefined || row.minDate === null || row.maxDate === null) {
		throw error(500, 'Server error');
	}
	throw redirect(
		302,
		urlJoin('/admin/analytics/', row.minDate.toISOString(), row.maxDate.toISOString())
	);
};
