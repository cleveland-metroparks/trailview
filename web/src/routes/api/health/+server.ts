import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export type GetResType = { success: true };

export const GET = (async () => {
	return json({ success: true } satisfies GetResType);
}) satisfies RequestHandler;
