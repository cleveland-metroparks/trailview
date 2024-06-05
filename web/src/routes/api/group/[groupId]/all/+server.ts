import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroup, type GroupData } from '../common';
import z from 'zod';

export type GetResType = { success: false; message: string } | { success: true; data: GroupData };

export const GET = (async ({ params }) => {
	const groupIdParse = z.number().int().safeParse(params.groupId);
	if (groupIdParse.success !== true) {
		return json({ success: false, message: 'Invalid group id' } satisfies GetResType, {
			status: 400
		});
	}
	const groupData = await getGroup(groupIdParse.data, true);
	if (groupData instanceof Error) {
		return json({ success: false, message: groupData.message } satisfies GetResType, {
			status: 400
		});
	}
	return json({ success: true, data: groupData } satisfies GetResType);
}) satisfies RequestHandler;
