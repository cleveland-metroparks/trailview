import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { sql } from 'drizzle-orm';

export const load = (async () => {
	const lat = 41.391979;
	const lng = -81.686081;
	const imageQuery = await db
		.select({
			id: schema.image.id,
			distance: sql`ST_Distance(coordinates::geography,ST_SETSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography) AS distance`
		})
		.from(schema.image)
		.orderBy(sql`distance`)
		.limit(1);
	console.log(imageQuery);
}) satisfies PageServerLoad;
