import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import z from 'zod';
import { isApiAdmin } from '$api/common';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';

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

export const GET = (async ({ params, url, cookies, request }) => {
	const includePrivate = url.searchParams.get('private') !== null;
	if (includePrivate && !(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' } satisfies GetResType, { status: 401 });
	}
	const groupIdParse = z.coerce.number().int().safeParse(params.groupId);
	if (groupIdParse.success !== true) {
		return json({ success: false, message: 'Invalid group id' } satisfies GetResType, {
			status: 400
		});
	}
	const groupQuery = await db
		.select({ id: schema.group.id, name: schema.group.name })
		.from(schema.group)
		.where(eq(schema.group.id, groupIdParse.data));
	const group = groupQuery.at(0);
	if (group === undefined) {
		return json({ success: false, message: 'Group not found' } satisfies GetResType, {
			status: 404
		});
	}
	const groupImageQuery = db
		.$with('groupImage')
		.as(
			db
				.select({ groupImageId: schema.imageGroupRelation.imageId })
				.from(schema.imageGroupRelation)
				.where(eq(schema.imageGroupRelation.groupId, group.id))
		);
	const imagesQuery =
		includePrivate === true
			? await db
					.with(groupImageQuery)
					.select({ id: schema.image.id })
					.from(schema.image)
					.innerJoin(groupImageQuery, eq(groupImageQuery.groupImageId, schema.image.id))
			: await db
					.with(groupImageQuery)
					.select({ id: schema.image.id })
					.from(schema.image)
					.where(eq(schema.image.public, true))
					.innerJoin(groupImageQuery, eq(groupImageQuery.groupImageId, schema.image.id));
	return json({
		success: true,
		data: { id: group.id, name: group.name, images: imagesQuery }
	} satisfies GetResType);
}) satisfies RequestHandler;
