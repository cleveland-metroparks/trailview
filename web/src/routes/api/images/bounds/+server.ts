import { imageQuerySelect, isApiAdmin } from '$api/common';
import { db, schema } from '$lib/server/db';
import { json, type RequestHandler } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { type ImageData } from '$api/common';

export type GetResType = { success: false; message: string } | { success: true; data: ImageData[] };

export const GET = (async ({ url, cookies, request }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const paramMinLat = url.searchParams.get('minLat');
	const paramMinLng = url.searchParams.get('minLng');
	const paramMaxLat = url.searchParams.get('maxLat');
	const paramMaxLng = url.searchParams.get('maxLng');
	if (
		paramMinLat === null ||
		paramMinLng === null ||
		paramMaxLat === null ||
		paramMaxLng === null
	) {
		return json(
			{
				success: false,
				message: 'minLat, minLng, maxLat, and maxLng query params required'
			} satisfies GetResType,
			{ status: 400 }
		);
	}
	const minLat = z.coerce.number().finite().safeParse(paramMinLat);
	const minLng = z.coerce.number().finite().safeParse(paramMinLng);
	const maxLat = z.coerce.number().finite().safeParse(paramMaxLat);
	const maxLng = z.coerce.number().finite().safeParse(paramMaxLng);
	if (!minLat.success || !minLng.success || !maxLat.success || !maxLng.success) {
		return json({ success: false, message: 'Invalid query param values' } satisfies GetResType, {
			status: 400
		});
	}
	const imagesQuery = await db
		.select(imageQuerySelect)
		.from(schema.image)
		.where(
			sql`ST_Within(${schema.image.coordinates}), ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)`
		);
	return json({ success: true, data: imagesQuery } satisfies GetResType);
}) satisfies RequestHandler;
