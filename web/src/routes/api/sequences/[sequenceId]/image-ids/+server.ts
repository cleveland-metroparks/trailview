import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { querySequenceImageIds, type GetResType } from './common';
import z from 'zod';

export const GET = (async ({ params }) => {
	const paramSequenceId = z.coerce.number().int().safeParse(params.sequenceId);
	if (paramSequenceId.success !== true) {
		return json({ success: false, message: 'Invalid sequence id' } satisfies GetResType, {
			status: 400
		});
	}
	const imageIds = await querySequenceImageIds({
		sequenceId: paramSequenceId.data,
		includePrivate: false
	});
	return json({ success: true, data: imageIds } satisfies GetResType);
}) satisfies RequestHandler;
