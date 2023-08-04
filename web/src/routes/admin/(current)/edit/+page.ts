import { fetchTrails } from '$lib/mapsApi';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { PageLoad } from './$types';

export const load = (async ({ fetch }) => {
	const sequencesDataType = z.array(
		z.object({
			name: z.string(),
			id: z.number().int(),
			mapsApiTrailId: z.number().int().nullable()
		})
	);

	const res = await fetch('/api/sequences', { method: 'GET' });
	const data = await res.json();
	if (!data.success) {
		throw error(500, 'Unable to fetch data from API');
	}
	const sequences = sequencesDataType.safeParse(data.data);
	if (!sequences.success) {
		throw error(500, `Invalid data: ${sequences.error.message}`);
	}

	const mapsApiTrails = await fetchTrails(fetch);
	if (mapsApiTrails instanceof Error) {
		console.error(mapsApiTrails.message);
	}
	return {
		sequences: sequences.data,
		mapsApi: { trails: mapsApiTrails instanceof Error ? null : mapsApiTrails }
	};
}) satisfies PageLoad;
