import { isApiAdmin } from '$api/common.js';
import { db } from '$lib/server/db.js';
import { json } from '@sveltejs/kit';
import * as schema from '$db/schema';
import type { RequestHandler } from './$types';

type GetResType =
	| { success: false; message: string }
	| {
			success: true;
			data: {
				id: number;
				name: string;
				status: 'manifest' | 'upload' | 'blur' | 'tile' | 'done';
				toDelete: boolean;
			}[];
	  };

export const GET = (async ({ cookies, request }) => {
	if ((await isApiAdmin(cookies, request.headers)) !== true) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 403 });
	}
	const sequencesQuery = await db
		.select({
			id: schema.sequence.id,
			name: schema.sequence.name,
			status: schema.sequence.status,
			toDelete: schema.sequence.toDelete
		})
		.from(schema.sequence);
	return json({ success: true, data: sequencesQuery } satisfies GetResType);
}) satisfies RequestHandler;
