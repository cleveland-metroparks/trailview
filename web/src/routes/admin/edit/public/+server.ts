import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { refreshGeoJsonData } from '$lib/server/geojson';
import { inArray } from 'drizzle-orm';

const patchReqType = z.object({
	imageIds: z.array(z.string().nonempty())
});

export const PATCH = (async ({ request }) => {
	let jsonData: unknown;
	try {
		jsonData = await request.json();
	} catch (e) {
		console.error(e);
		return json({ success: false, message: 'Invalid JSON' }, { status: 400 });
	}
	const req = patchReqType.safeParse(jsonData);
	if (req.success !== true) {
		return json({ success: false, message: `Invalid data: ${req.error.message}` }, { status: 400 });
	}
	try {
		await db
			.update(schema.image)
			.set({ public: true })
			.where(inArray(schema.image.id, req.data.imageIds));
	} catch (error) {
		console.error(error);
		return json({ success: false, message: 'Database error' }, { status: 500 });
	}
	await refreshGeoJsonData();
	return json({ success: true });
}) satisfies RequestHandler;
