import type { Actions, PageServerLoad } from './$types';
import { API_KEY } from '$env/static/private';
import { PUBLIC_API_URL } from '$env/static/public';
import urlJoin from 'url-join';
import { redirectIfSessionInvalid } from '$lib/server/auth';
import { db } from '$lib/server/prisma';

export const load = (async ({ cookies }) => {
	await redirectIfSessionInvalid('/login', cookies);
}) satisfies PageServerLoad;

export const actions = {
	image: async ({ request, fetch }) => {
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
		return { success: true };
	},
	sequence: async ({ request }) => {
		const data = await request.formData();
		const formPitch = data.get('pitch');
		const formSequenceId = data.get('sequenceId');
		const formIsPublic = data.get('isPublic');
		const formFlip = data.get('flip');
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
		const pitch = parseFloat(formPitch.toString());
		await db.image.updateMany({
			where: { sequenceId: sequenceId },
			data: {
				flipped: formFlip ? true : false,
				pitchCorrection: pitch,
				visibility: formIsPublic ? true : false
			}
		});
		return { success: true };
	}
} satisfies Actions;
