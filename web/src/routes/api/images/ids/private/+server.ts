import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryImageIds, type GetResType } from '../common';
import { isApiAdmin } from '$api/common';

export const GET = (async ({ request, cookies }) => {
	if ((await isApiAdmin(cookies, request.headers)) !== true) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 403 });
	}
	const imageIds = await queryImageIds({ includePrivate: true });
	return json({ success: true, data: imageIds } satisfies GetResType);
}) satisfies RequestHandler;
