import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryGroup, type GetResType } from '../common';
import z from 'zod';
import { isApiAdmin } from '$api/common';

export const GET = (async ({ params, cookies, request }) => {
	if (!(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 403 });
	}
	const groupIdParse = z.coerce.number().int().safeParse(params.groupId);
	if (groupIdParse.success !== true) {
		return json({ success: false, message: 'Invalid group id' } satisfies GetResType, {
			status: 400
		});
	}
	const groupData = await queryGroup({ groupId: groupIdParse.data, includePrivate: true });
	if (groupData === null) {
		return json({ success: false, message: 'Invalid group' } satisfies GetResType, {
			status: 400
		});
	}
	return json({ success: true, data: groupData } satisfies GetResType);
}) satisfies RequestHandler;
