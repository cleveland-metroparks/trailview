import type { RequestHandler } from './$types';
import { isSessionValid } from '$lib/server/auth';
import fs from 'fs';
import { json } from '@sveltejs/kit';
import { join } from 'path';
import { pascalCase } from 'pascal-case';
import { IMAGES_PATH } from '$env/static/private';
import { db } from '$lib/server/prisma';

export const POST = (async ({ request, cookies }) => {
	if (!isSessionValid(cookies)) {
		return json({ success: false, message: 'Unauthorized' }, { status: 403 });
	}
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

	const sequence = await db.sequence.findUnique({ where: { name: sequenceName } });
	if (sequence === null || sequence.status !== 'Upload') {
		return json({ success: false, message: 'Invalid sequence or sequence has invalid status' });
	}

	const file = formFile as File;

	if (!fs.existsSync(join(IMAGES_PATH, sequenceName))) {
		await fs.promises.mkdir(join(IMAGES_PATH, sequenceName));
		if (!fs.existsSync(join(IMAGES_PATH, sequenceName, 'img_original'))) {
			await fs.promises.mkdir(join(IMAGES_PATH, sequenceName, 'img_original'));
		}
	}

	const writer = fs.createWriteStream(join(IMAGES_PATH, sequenceName, 'img_original', file.name));
	const reader = file.stream().getReader();
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const { done, value } = await reader.read();
		if (done === true) {
			break;
		}
		await new Promise<void>((resolve, reject) => {
			writer.write(value, (error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}
	return json({ success: true });
}) satisfies RequestHandler;
