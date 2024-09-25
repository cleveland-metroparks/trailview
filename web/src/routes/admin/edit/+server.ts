import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { refreshGeoJsonData } from '$lib/server/geojson';
import { eq } from 'drizzle-orm';

const patchRequestType = z.object({
	data: z.array(
		z.object({
			imageId: z.string().min(1),
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
	} catch (e) {
		console.error(e);
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
				.set({ coordinates: [p.new.longitude, p.new.latitude] })
				.where(eq(schema.image.id, p.imageId));
		}
	} catch (error) {
		console.error(error);
		await refreshGeoJsonData();
		return json({ success: false, message: 'Database error' }, { status: 500 });
	}
	await refreshGeoJsonData();
	return json({ success: true });
}) satisfies RequestHandler;
