import { refreshGeoJsonData } from '$lib/server/geojson';
import { db } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';
import * as schema from '$db/schema';
import { count, eq } from 'drizzle-orm';
import { fetchTrails } from '$lib/mapsApi';

export const load = (async () => {
	const groupsQuery = await db
		.select({ id: schema.group.id, name: schema.group.name })
		.from(schema.group);
	const groups = groupsQuery.toSorted((a, b) => {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});

	const sequencesQuery = await db
		.select({
			id: schema.sequence.id,
			name: schema.sequence.name,
			mapsApiTrailId: schema.sequence.mapsApiTrailId
		})
		.from(schema.sequence);
	const sequences = sequencesQuery.toSorted((a, b) => {
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});

	const mapsApiTrails = await fetchTrails();
	if (mapsApiTrails instanceof Error) {
		console.error(mapsApiTrails.message);
	}
	return {
		groups,
		sequences: sequences,
		mapsApiTrails: mapsApiTrails instanceof Error ? null : mapsApiTrails
	};
}) satisfies PageServerLoad;

export const actions = {
	image: async ({ request }) => {
		const data = await request.formData();
		const formImageId = data.get('imageId');
		const formPublic = data.get('public');
		if (formImageId === null) {
			return { success: false, message: 'Image Id not specified' };
		}
		await db
			.update(schema.image)
			.set({ public: formPublic !== null })
			.where(eq(schema.image.id, formImageId.toString()));
		await refreshGeoJsonData();
		return { success: true };
	},
	sequence: async ({ request }) => {
		const data = await request.formData();
		const formPitch = data.get('pitch');
		const formSequenceId = data.get('sequenceId');
		const formIsPublic = data.get('isPublic');
		const formFlip = data.get('flip');
		const formMapsApiTrailId = data.get('mapsApiTrailId');
		if (formPitch === null) {
			return { success: false, message: 'pitch not specified' };
		}
		if (formSequenceId === null) {
			return { success: false, message: 'Sequence Id not specified' };
		}
		const sequenceId = parseInt(formSequenceId.toString());
		if (isNaN(sequenceId)) {
			return { success: false, message: 'Sequence id is not a number' };
		}
		if (formMapsApiTrailId !== null) {
			const idStr = formMapsApiTrailId.toString();
			if (idStr === 'unassigned') {
				await db
					.update(schema.sequence)
					.set({ mapsApiTrailId: null })
					.where(eq(schema.sequence.id, sequenceId));
			} else if (!isNaN(parseInt(idStr))) {
				await db
					.update(schema.sequence)
					.set({ mapsApiTrailId: parseInt(idStr) })
					.where(eq(schema.sequence.id, sequenceId));
			}
		}
		const pitch = parseFloat(formPitch.toString());
		await db
			.update(schema.image)
			.set({ flipped: formFlip !== null, pitchCorrection: pitch, public: formIsPublic !== null })
			.where(eq(schema.image.sequenceId, sequenceId));
		await refreshGeoJsonData();
		return { success: true };
	},
	refresh: async () => {
		refreshGeoJsonData();
		return { success: true };
	},
	'create-group': async ({ request }) => {
		const form = await request.formData();
		const formName = form.get('name');
		if (formName === null) {
			return { success: false, message: 'Incomplete form data' };
		}
		const name = formName.toString().trim();
		if (name === '') {
			return { success: false, message: 'Empty name' };
		}
		const duplicateQuery = await db
			.select({ count: count() })
			.from(schema.group)
			.where(eq(schema.group.name, name));
		const duplicateCount = duplicateQuery[0].count;
		if (duplicateCount !== 0) {
			return { success: false, message: 'Name already taken' };
		}
		await db.insert(schema.group).values({ name });
		return { success: true };
	},
	'delete-group': async ({ request }) => {
		const form = await request.formData();
		const formGroupId = form.get('groupId');
		if (formGroupId === null) {
			return { success: false, message: 'Incomplete form data' };
		}
		const groupId = parseInt(formGroupId.toString());
		if (isNaN(groupId)) {
			return { success: false, message: 'Invalid group id' };
		}
		try {
			await db
				.delete(schema.imageGroupRelation)
				.where(eq(schema.imageGroupRelation.groupId, groupId));
			await db.delete(schema.group).where(eq(schema.group.id, groupId));
		} catch (error) {
			console.error(error);
			return { success: false, message: 'Database error' };
		}
		return { success: true };
	}
} satisfies Actions;
