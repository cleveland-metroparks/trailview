import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { isApiAdmin } from '$api/common';
import type { GetResType, GetResTypePrivate } from '../common';

export const GET = (async ({ cookies, request }) => {
	if (!(await isApiAdmin(cookies, request.headers)) === true) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 403 });
	}
	const imagesQuery = await db
		.select({
			id: schema.image.id,
			sequenceId: schema.image.sequenceId,
			coordinates: schema.image.coordinates,
			bearing: schema.image.bearing,
			flipped: schema.image.flipped,
			pitchCorrection: schema.image.pitchCorrection,
			public: schema.image.public
		})
		.from(schema.image);
	return json({ success: true, data: imagesQuery } satisfies GetResTypePrivate);
}) satisfies RequestHandler;
