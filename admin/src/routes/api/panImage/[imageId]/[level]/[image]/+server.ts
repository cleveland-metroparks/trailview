import { IMAGES_PATH } from '$env/static/private';
import { db } from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { join } from 'path';
import fs from 'fs';
import { Readable } from 'stream';

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
	const fileStream = fs.createReadStream(filePath);
	const readable = Readable.from(fileStream, { objectMode: true });
	const stream = new ReadableStream({
		start(controller) {
			readable.on('data', (chunk) => {
				controller.enqueue(chunk);
			});

			readable.on('end', () => {
				controller.close();
			});

			readable.on('error', (error) => {
				controller.error(error);
			});
		}
	});
	return new Response(stream, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Content-Disposition': `inline; filename=${params.image}`
		}
	});
}) satisfies RequestHandler;
