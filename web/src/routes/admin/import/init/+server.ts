import { isSessionValid } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/prisma';
import { pascalCase } from 'pascal-case';

const postDataType = z.object({
	sequenceName: z.string()
});

export const POST = (async ({ request, cookies }) => {
	if (!isSessionValid(cookies)) {
		return json({ success: false, message: 'Unauthorized' }, { status: 403 });
	}
	let postData: unknown;
	try {
		postData = await request.json();
	} catch (error) {
		return json({ success: false, message: 'Invalid JSON' }, { status: 400 });
	}
	const data = postDataType.safeParse(postData);
	if (data.success === false) {
		return json({ success: false, message: 'Invalid JSON' }, { status: 400 });
	}
	const sequence = await db.sequence.findUnique({
		where: { name: pascalCase(data.data.sequenceName) }
	});
	if (sequence) {
		return json(
			{ success: false, message: 'Sequence with name already exists, delete first' },
			{ status: 400 }
		);
	}
	await db.sequence.create({
		data: { name: pascalCase(data.data.sequenceName), status: 'Upload', isPublic: false }
	});
	return json({ success: true });
}) satisfies RequestHandler;
