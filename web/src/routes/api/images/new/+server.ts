import { isApiAdmin } from '$api/common';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';

type GetResType = { success: false; message: string } | { success: true };

export const POST: RequestHandler = async ({ request, cookies }) => {
	if ((await isApiAdmin(cookies, request.headers)) !== true) {
		return json({ success: false, message: 'Unauthorized' } as GetResType, { status: 403 });
	}
	const bodySchema = z.object({
		id: z.string().length(32),
		latitude: z.number(),
		longitude: z.number(),
		bearing: z.number(),
		flipped: z.boolean(),
		shtHash: z.string().length(74),
		pitchCorrection: z.number(),
		createdAt: z
			.string()
			.datetime()
			.transform((d) => new Date(d)),
		public: z.boolean(),
		sequenceId: z.number().int()
	});
	const bodyParse = bodySchema.safeParse(await request.json());
	if (bodyParse.success !== true) {
		return json({ success: false, message: 'Invalid request' } satisfies GetResType, {
			status: 400
		});
	}
	const i = bodyParse.data;
	const insertQuery = await db
		.insert(schema.image)
		.values({
			id: i.id,
			originalLatitude: i.latitude,
			originalLongitude: i.longitude,
			coordinates: [i.longitude, i.latitude],
			bearing: i.bearing,
			flipped: i.flipped,
			shtHash: i.shtHash,
			pitchCorrection: i.pitchCorrection,
			createdAt: i.createdAt,
			public: i.public,
			sequenceId: i.sequenceId
		})
		.returning();
	if (insertQuery.length === 0) {
		return json(
			{ success: false, message: 'Failed to insert into database' } satisfies GetResType,
			{ status: 500 }
		);
	}
	return json({ success: true } satisfies GetResType);
};
