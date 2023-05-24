import type { Actions } from './$types';
import { API_KEY } from '$env/static/private';
import { PUBLIC_API_URL } from '$env/static/public';
import urlJoin from 'url-join';

export const actions = {
	sequence: async ({ request, fetch }) => {
		const data = await request.formData();
		const formPitch = data.get('pitch');
		const formSequenceId = data.get('sequenceId');
		const formIsPublic = data.get('isPublic');
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

		return { success: true };
	}
} satisfies Actions;
