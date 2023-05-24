import type { Actions } from './$types';
import { API_KEY } from '$env/static/private';
import { PUBLIC_API_URL } from '$env/static/public';
import urlJoin from 'url-join';

export const actions = {
	pitch: async ({ request, fetch }) => {
		const data = await request.formData();
		const formPitch = data.get('pitch');
		const formSequenceId = data.get('sequenceId');
		if (!formPitch) {
			return { success: false, message: 'pitch not specified' };
		}
		if (!formSequenceId) {
			return { success: false, message: 'Sequence Id not specified' };
		}
		const pitch = parseFloat(formPitch.toString());
		const res = await fetch(urlJoin(PUBLIC_API_URL, '/pitch', `/${formSequenceId.toString()}`), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				apiKey: API_KEY,
				pitch: pitch
			})
		});
		const resData = await res.json();
		if (!resData.success) {
			return { success: false, message: resData.message };
		} else {
			return { success: true };
		}
	}
} satisfies Actions;
