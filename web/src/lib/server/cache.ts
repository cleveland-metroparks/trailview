import { building, dev } from '$app/environment';
import { z } from 'zod';
import { refreshGeoJsonData } from './geojson';

export const processMessageSchema = z.object({ type: z.literal('refreshCache') });
export type ProcessMessage = z.infer<typeof processMessageSchema>;

export async function broadcastCacheRefresh() {
	if (dev) {
		await refreshGeoJsonData();
		// await _refreshImageCache();
	} else {
		process.send?.({ type: 'refreshCache' } satisfies ProcessMessage);
	}
}

if (!building) {
	process.on('message', async (message: unknown) => {
		const parse = processMessageSchema.safeParse(message);
		if (parse.success) {
			await refreshGeoJsonData();
			// await _refreshImageCache();
		}
	});
}
