import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroup } from '../common';

export type GetResType =
	| { success: false; message: string }
	| {
			success: true;
			data: {
				id: number;
				name: string;
				images: {
					id: string;
				}[];
			};
	  };

export const GET = (async ({ params }) => {
	const data = await getGroup(parseInt(params.groupId), true);
	if (data instanceof Error) {
		return json({ success: false, message: data.message } as GetResType);
	}
	return json({ success: true, data: data } as GetResType);
}) satisfies RequestHandler;
