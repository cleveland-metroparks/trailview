import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import z from 'zod';
import { imageQuerySelect, isApiAdmin, type ImageData } from '$api/common';
import { db, schema } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';

export type GetResType =
	| { success: false; message: string }
	| { success: true; data: ImageData & { distance: number } };

export const GET = (async ({ cookies, request, url }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const latitudeParse = z.coerce.number().safeParse(url.searchParams.get('lat'));
	const longitudeParse = z.coerce.number().safeParse(url.searchParams.get('lng'));
	if (latitudeParse.success !== true || longitudeParse.success !== true) {
		return json({ success: false, message: 'Invalid lat/lng' } satisfies GetResType, {
			status: 400
		});
	}
	const imageQueryBase = db
		.select({
			...imageQuerySelect,
			distance: sql<number>`ST_Distance(coordinates::geography,
				ST_SETSRID(ST_MakePoint(${longitudeParse.data}, ${latitudeParse.data}),4326)::geography) 
				AS distance`
		})
		.from(schema.image)
		.orderBy(sql`distance`)
		.limit(1);
	const imageQuery = includePrivate
		? await imageQueryBase
		: await imageQueryBase.where(eq(schema.image.public, true));
	const image = imageQuery.at(0);
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' } satisfies GetResType, {
			status: 404
		});
	}
	return json({ success: true, data: image } satisfies GetResType);
}) satisfies RequestHandler;
