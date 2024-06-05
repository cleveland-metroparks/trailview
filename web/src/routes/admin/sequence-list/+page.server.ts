import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
import * as schema from '$db/schema';
import type { Actions } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

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

export const actions = {
	delete: async ({ request }) => {
		const form = await request.formData();
		const formSequenceId = form.get('sequenceId');
		if (formSequenceId === null) {
			return { success: false, message: 'No sequence id specified' };
		}
		const sequenceId = parseInt(formSequenceId.toString());
		if (isNaN(sequenceId)) {
			return { success: false, message: 'Invalid sequence id' };
		}
		await db
			.update(schema.sequence)
			.set({ toDelete: true })
			.where(eq(schema.sequence.id, sequenceId));
		return { success: true };
	}
} satisfies Actions;
