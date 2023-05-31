import type { RequestHandler } from './$types';
import { redirectIfSessionInvalid } from '$lib/server/auth';
import fs from 'fs';
import { json } from '@sveltejs/kit';
import { join } from 'path';

export const POST = (async ({ request, cookies }) => {
	await redirectIfSessionInvalid('/login', cookies);
	const formData = await request.formData();
	const formFile = formData.get('file');
	const formFileName = formData.get('fileName');
	if (formFile === null || formFileName === null) {
		return json({ success: false });
	}
	const file = formFile as File;
	const writer = fs.createWriteStream(join('images', file.name));
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
