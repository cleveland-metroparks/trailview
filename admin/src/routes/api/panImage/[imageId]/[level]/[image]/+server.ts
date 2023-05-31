import { IMAGES_PATH } from '$env/static/private';
import { db } from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { join } from 'path';
import { promises as fs } from 'fs';

const imageFileRegex = new RegExp(/^[a-z][0-9]_[0-9]\.jpg$/);

export const GET = (async ({ params }) => {
	const image = await db.image.findUnique({
		where: { id: params.imageId },
		include: { sequence: { select: { name: true } } }
	});
	if (image === null) {
		return json({ success: false, message: 'Image not found' }, { status: 404 });
	}
	const level = parseInt(params.level);
	if (isNaN(level) || level < 1 || level > 3) {
		return json({ success: false, message: 'Invalid level' }, { status: 400 });
	}
	if (imageFileRegex.test(params.image) === false) {
		return json({ success: false, message: 'Invalid image' }, { status: 400 });
	}
	const filePath = join(
		IMAGES_PATH,
		image.sequence.name,
		'img',
		image.id,
		level.toString(),
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
