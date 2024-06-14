import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { join } from 'path';
import { promises as fs } from 'fs';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';
import { isApiAdmin } from '$api/common';

const imageFileRegex = new RegExp(/^[a-z][0-9]_[0-9]\.jpg$/);

export const GET = (async ({ params, cookies, request }) => {
	if (!(await isApiAdmin(cookies, request.headers))) {
		return json({ success: false, message: 'Unauthorized' }, { status: 403 });
	}
	const sequencesQuery = db
		.$with('sequence')
		.as(
			db
				.select({ sequenceId: schema.sequence.id, sequenceName: schema.sequence.name })
				.from(schema.sequence)
		);
	const imageQuery = await db
		.with(sequencesQuery)
		.select({
			id: schema.image.id,
			sequenceId: schema.image.sequenceId,
			sequenceName: sequencesQuery.sequenceName
		})
		.from(schema.image)
		.where(eq(schema.image.id, params.imageId))
		.innerJoin(sequencesQuery, eq(sequencesQuery.sequenceId, schema.image.sequenceId));
	const image = imageQuery.at(0);
	if (image === undefined) {
		return json({ success: false, message: 'Image not found' }, { status: 404 });
	}
	if (params.level !== '1' && params.level !== '2' && params.level !== '3') {
		return json({ success: false, message: 'Invalid level' }, { status: 400 });
	}
	if (imageFileRegex.test(params.image) === false) {
		return json({ success: false, message: 'Invalid image' }, { status: 400 });
	}
	const filePath = join(
		env.IMAGES_PATH,
		image.sequenceName,
		'img',
		image.id,
		params.level,
		params.image
	);
	const file = await fs.readFile(filePath);
	return new Response(file, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Content-Disposition': `inline; filename=${params.image}`
		}
	});
}) satisfies RequestHandler;
