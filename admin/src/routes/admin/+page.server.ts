import type { Actions, PageServerLoad } from './$types';
import { API_KEY } from '$env/static/private';
import { PUBLIC_API_URL } from '$env/static/public';
import urlJoin from 'url-join';
import { redirectIfSessionInvalid } from '$lib/server/auth';

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
		const res = await fetch(
			urlJoin(PUBLIC_API_URL, '/image', `/${formImageId.toString()}`, '/public'),
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: API_KEY,
					public: formPublic ? true : false
				})
			}
		);
		const resData = await res.json();
		if (!resData.success) {
			return { success: false, message: resData.message };
		}
		return { success: true };
	},
	sequence: async ({ request, fetch }) => {
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
		const pitch = parseFloat(formPitch.toString());
		const resPitch = await fetch(
			urlJoin(PUBLIC_API_URL, '/pitch', `/${formSequenceId.toString()}`),
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: API_KEY,
					pitch: pitch
				})
			}
		);
		const resDataPitch = await resPitch.json();
		if (!resDataPitch.success) {
			return { success: false, message: resDataPitch.message };
		}

		const resPublic = await fetch(
			urlJoin(PUBLIC_API_URL, '/sequence', `/${formSequenceId.toString()}`, '/public'),
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: API_KEY,
					public: formIsPublic ? true : false
				})
			}
		);
		const resDataPublic = await resPublic.json();
		if (!resDataPublic.success) {
			return { success: false, message: resDataPublic.message };
		}

		const resFlip = await fetch(
			urlJoin(PUBLIC_API_URL, '/sequence', `/${formSequenceId.toString()}`, '/flip'),
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: API_KEY,
					flip: formFlip ? true : false
				})
			}
		);
		const resDataFlip = await resFlip.json();
		if (!resDataFlip.success) {
			return { success: false, message: resDataFlip.message };
		}

		return { success: true };
	}
} satisfies Actions;
