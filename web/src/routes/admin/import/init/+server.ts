import { isSessionValid } from '$lib/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { pascalCase } from 'pascal-case';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';

const postDataType = z.object({
	sequenceName: z.string()
});

export const POST = (async ({ request, cookies }) => {
	if ((await isSessionValid(cookies)) !== true) {
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
	const sequenceQuery = await db
		.select({})
		.from(schema.sequence)
		.where(eq(schema.sequence.name, pascalCase(data.data.sequenceName)));
	const sequence = sequenceQuery.at(0);
	if (sequence !== undefined) {
		return json(
			{ success: false, message: 'Sequence with name already exists, delete first' },
			{ status: 400 }
		);
	}
	await db
		.insert(schema.sequence)
		.values({ name: pascalCase(data.data.sequenceName), status: 'upload', public: false });
	return json({ success: true });
}) satisfies RequestHandler;
