import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import * as schema from '$db/schema';

export const load = (async () => {
	const sequencesQuery = await db
		.select({
			id: schema.sequence.id,
			name: schema.sequence.name,
			status: schema.sequence.status,
			toDelete: schema.sequence.toDelete
		})
		.from(schema.sequence);
	return {
		sequences: sequencesQuery.sort((a, b) => {
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
