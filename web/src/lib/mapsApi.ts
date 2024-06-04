import { env } from '$env/dynamic/public';
import urlJoin from 'url-join';
import { z } from 'zod';

const trailsResType = z.union([
	z.object({
		success: z.literal(false)
	}),
	z.object({
		success: z.literal(true),
		data: z.array(
			z.object({
				id: z.number(),
				name: z.string(),
				description: z.string().nullable()
			})
		)
	})
]);

export async function fetchTrails(
	f: typeof fetch = fetch
): Promise<{ id: number; name: string; description: string | null }[] | Error> {
	if (env.PUBLIC_MAPS_API === '') {
		return new Error('No Maps API URL specified');
	}
	const res = await f(urlJoin(env.PUBLIC_MAPS_API, '/trails'), { method: 'GET' });
	if (res.status !== 200) {
		return new Error(`${res.status}: ${res.statusText}`);
	}
	const data: unknown = await res.json();
	const trailsData = trailsResType.safeParse(data);
	if (trailsData.success !== true) {
		return new Error(`Unexpected data: ${trailsData.error.message}`);
	}
	if (trailsData.data.success !== true) {
		return new Error('API returned unsuccessful');
	}
	return trailsData.data.data;
}
