import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { querySequenceImageIds, type GetResType } from '../common';
import z from 'zod';
import { isApiAdmin } from '$api/common';

export const GET = (async ({ params, cookies, request }) => {
	if ((await isApiAdmin(cookies, request.headers)) !== true) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 403 });
	}
	const paramSequenceId = z.coerce.number().int().safeParse(params.sequenceId);
	if (paramSequenceId.success !== true) {
		return json({ success: false, message: 'Invalid sequence id' } satisfies GetResType, {
			status: 400
		});
	}
	const imageIds = await querySequenceImageIds({
		sequenceId: paramSequenceId.data,
		includePrivate: true
	});
	return json({ success: true, data: imageIds } satisfies GetResType);
}) satisfies RequestHandler;
