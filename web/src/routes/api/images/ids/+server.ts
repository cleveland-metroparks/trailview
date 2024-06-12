import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryImageIds, type GetResType } from './common';

export const GET = (async () => {
	const imageIds = await queryImageIds({ includePrivate: false });
	return json({ success: true, data: imageIds } satisfies GetResType);
}) satisfies RequestHandler;
