import type { RequestHandler } from './$types';
import fs from 'fs';
import { json } from '@sveltejs/kit';
import { join } from 'path';
import { pascalCase } from 'pascal-case';
import { IMAGES_PATH } from '$env/static/private';
import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';

export const POST = (async ({ request }) => {
	const formData = await request.formData();
	const formFile = formData.get('file');
	const formFileName = formData.get('fileName');
	const formSequenceName = formData.get('sequenceName');
	if (
		formFile === null ||
		formFileName === null ||
		formSequenceName === null ||
		formSequenceName.toString().trim() === ''
	) {
		return json({ success: false });
	}
	const sequenceName = pascalCase(formSequenceName.toString());

	const sequenceQuery = await db
		.select({ status: schema.sequence.status })
		.from(schema.sequence)
		.where(eq(schema.sequence.name, sequenceName));
	const sequence = sequenceQuery.at(0);
	if (sequence === undefined || sequence.status !== 'upload') {
		return json({ success: false, message: 'Invalid sequence or sequence has invalid status' });
	}

	const file = formFile as File;

	if (!fs.existsSync(join(IMAGES_PATH, sequenceName))) {
		await fs.promises.mkdir(join(IMAGES_PATH, sequenceName));
		if (!fs.existsSync(join(IMAGES_PATH, sequenceName, 'img_original'))) {
			await fs.promises.mkdir(join(IMAGES_PATH, sequenceName, 'img_original'));
		}
	}
	fs.appendFileSync(
		join(IMAGES_PATH, sequenceName, 'img_original', file.name),
		Buffer.from(await file.arrayBuffer())
	);
	return json({ success: true });
}) satisfies RequestHandler;
