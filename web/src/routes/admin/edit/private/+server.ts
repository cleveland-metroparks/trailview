import { isSessionValid } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/prisma';
import { refreshImageData } from '$lib/server/dbcache';
import { refreshGeoJsonData } from '$lib/server/geojson';

const patchReqType = z.object({
	imageIds: z.array(z.string().nonempty())
});

export const PATCH = (async ({ cookies, request }) => {
	if ((await isSessionValid(cookies)) !== true) {
		return json({ success: false, message: 'Invalid session' }, { status: 403 });
	}
	let jsonData: unknown;
	try {
		jsonData = await request.json();
	} catch (error) {
		return json({ success: false, message: 'Invalid JSON' }, { status: 400 });
	}
	const req = patchReqType.safeParse(jsonData);
	if (req.success !== true) {
		return json({ success: false, message: `Invalid data: ${req.error.message}` }, { status: 400 });
	}
	try {
		await db.image.updateMany({
			where: { id: { in: req.data.imageIds } },
			data: { visibility: false }
		});
	} catch (error) {
		console.error(error);
		return json({ success: false, message: 'Database error' }, { status: 500 });
	}
	await refreshImageData(true);
	await refreshGeoJsonData(true);
	return json({ success: true });
}) satisfies RequestHandler;
