import { isSessionValid, redirectIfSessionInvalid } from '$lib/server/auth';
import { refreshImageData } from '$lib/server/dbcache';
import { refreshGeoJsonData } from '$lib/server/geojson';
import { db } from '$lib/server/prisma';
import type { Actions, PageServerLoad } from './$types';

export const load = (async ({ cookies }) => {
	await redirectIfSessionInvalid('/login', cookies);
}) satisfies PageServerLoad;

export const actions = {
	image: async ({ request, cookies }) => {
		if ((await isSessionValid(cookies)) !== true) {
			return { success: false, message: 'Invalid session' };
		}
		const data = await request.formData();
		const formImageId = data.get('imageId');
		const formPublic = data.get('public');
		if (!formImageId) {
			return { success: false, message: 'Image Id not specified' };
		}
		await db.image.update({
			where: { id: formImageId.toString() },
			data: { visibility: formPublic ? true : false }
		});
		await refreshImageData(true);
		await refreshGeoJsonData(true);
		return { success: true };
	},
	sequence: async ({ request, cookies }) => {
		if ((await isSessionValid(cookies)) !== true) {
			return { success: false, message: 'Invalid session' };
		}
		const data = await request.formData();
		const formPitch = data.get('pitch');
		const formSequenceId = data.get('sequenceId');
		const formIsPublic = data.get('isPublic');
		const formFlip = data.get('flip');
		const formMapsApiTrailId = data.get('mapsApiTrailId');
		if (!formPitch) {
			return { success: false, message: 'pitch not specified' };
		}
		if (!formSequenceId) {
			return { success: false, message: 'Sequence Id not specified' };
		}
		const sequenceId = parseInt(formSequenceId.toString());
		if (isNaN(sequenceId)) {
			return { success: false, message: 'Sequence id is not a number' };
		}
		if (formMapsApiTrailId !== null) {
			const idStr = formMapsApiTrailId.toString();
			if (idStr === 'unassigned') {
				await db.sequence.update({ where: { id: sequenceId }, data: { mapsApiTrailId: null } });
			} else if (!isNaN(parseInt(idStr))) {
				await db.sequence.update({
					where: { id: sequenceId },
					data: { mapsApiTrailId: parseInt(idStr) }
				});
			}
		}
		const pitch = parseFloat(formPitch.toString());
		await db.image.updateMany({
			where: { sequenceId: sequenceId },
			data: {
				flipped: formFlip ? true : false,
				pitchCorrection: pitch,
				visibility: formIsPublic ? true : false
			}
		});
		await refreshImageData(true);
		await refreshGeoJsonData(true);
		return { success: true };
	},
	refresh: async ({ cookies }) => {
		if ((await isSessionValid(cookies)) !== true) {
			return { success: false, message: 'Invalid session' };
		}
		refreshImageData(true);
		refreshGeoJsonData(true);
		return { success: true };
	}
} satisfies Actions;
