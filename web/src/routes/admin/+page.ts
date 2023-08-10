import type { PageLoad } from './$types';
import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { fetchTrails } from '$lib/mapsApi';

export const load = (async ({ data, fetch }) => {
	const sequencesDataType = z.array(
		z.object({
			name: z.string(),
			id: z.number().int(),
			mapsApiTrailId: z.number().int().nullable()
		})
	);

	const res = await fetch('/api/sequences', { method: 'GET' });
	const seqData = await res.json();
	if (seqData.success !== true) {
		throw error(500, 'Unable to fetch data from API');
	}
	const sequences = sequencesDataType.safeParse(seqData.data);
	if (!sequences.success) {
		throw error(500, `Invalid data: ${sequences.error.message}`);
	}

	const mapsApiTrails = await fetchTrails();
	if (mapsApiTrails instanceof Error) {
		console.error(mapsApiTrails.message);
	}
	return {
		...data,
		sequences: sequences.data.sort((a, b) => {
			if (a.name < b.name) {
				return -1;
			}
			if (a.name > b.name) {
				return 1;
			}
			return 0;
		}),
		mapsApi: { trails: mapsApiTrails instanceof Error ? null : mapsApiTrails }
	};
}) satisfies PageLoad;
