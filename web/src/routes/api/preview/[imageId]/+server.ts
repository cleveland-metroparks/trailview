import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as schema from '$db/schema';
import { and, eq } from 'drizzle-orm';
import type { GetResType } from './common';

export const GET = (async ({ params }) => {
	const imageQuery = await db
		.select({ shtHash: schema.image.shtHash })
		.from(schema.image)
		.where(and(eq(schema.image.id, params.imageId), eq(schema.image.public, true)));
	const image = imageQuery.at(0);
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: image.shtHash } satisfies GetResType);
}) satisfies RequestHandler;
