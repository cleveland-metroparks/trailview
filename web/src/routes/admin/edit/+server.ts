import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { refreshGeoJsonData } from '$lib/server/geojson';
import { refreshImageData } from '$lib/server/dbcache';
import { eq } from 'drizzle-orm';

const patchRequestType = z.object({
	data: z.array(
		z.object({
			imageId: z.string().nonempty(),
			new: z.object({
				latitude: z.number(),
				longitude: z.number()
			})
		})
	)
});
export type PatchRequestType = z.infer<typeof patchRequestType>;

export const PATCH = (async ({ request }) => {
	let jsonData: unknown;
	try {
		jsonData = await request.json();
	} catch (error) {
		return json({ success: false, message: 'Invalid JSON' }, { status: 400 });
	}
	const patch = patchRequestType.safeParse(jsonData);
	if (patch.success !== true) {
		return json(
			{ success: false, message: `Invalid data: ${patch.error.message}` },
			{ status: 400 }
		);
	}
	try {
		for (const p of patch.data.data) {
			await db
				.update(schema.image)
				.set({ latitude: p.new.latitude, longitude: p.new.longitude })
				.where(eq(schema.image.id, p.imageId));
		}
	} catch (error) {
		console.error(error);
		await refreshGeoJsonData(true);
		await refreshImageData(true);
		return json({ success: false, message: 'Database error' }, { status: 500 });
	}
	await refreshGeoJsonData(true);
	await refreshImageData(true);
	return json({ success: true });
}) satisfies RequestHandler;
