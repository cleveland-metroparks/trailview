import type { PageLoad } from './$types';
import { PUBLIC_API_URL } from '$env/static/public';
import urlJoin from 'url-join';
import { z } from 'zod';
import { error } from '@sveltejs/kit';

export const load = (async ({ fetch }) => {
	const sequencesDataType = z.array(
		z.object({
			name: z.string(),
			id: z.number().int()
		})
	);

	const res = await fetch(urlJoin(PUBLIC_API_URL, '/sequences'), { method: 'GET' });
	const data = await res.json();
	if (!data.success) {
		throw error(500, 'Unable to fetch data from API');
	}
	const sequences = sequencesDataType.safeParse(data.data);
	if (!sequences.success) {
		throw error(500, 'Invalid data format');
	}
	return { sequences: sequences.data };
}) satisfies PageLoad;
