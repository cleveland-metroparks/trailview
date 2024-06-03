import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';

export const GET = (async ({ params }) => {
	const imageQuery = await db
		.select({ shtHash: schema.image.shtHash })
		.from(schema.image)
		.where(eq(schema.image.id, params.imageId));
	const image = imageQuery.at(0);
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' }, { status: 404 });
	}
	return json({ success: true, data: image.shtHash });
}) satisfies RequestHandler;
