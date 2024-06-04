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

export const POST = (async ({ request }) => {
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
		.select({ id: schema.sequence.id, status: schema.sequence.status })
		.from(schema.sequence)
		.where(eq(schema.sequence.name, pascalCase(data.data.sequenceName)));
	const sequence = sequenceQuery.at(0);
	if (sequence === undefined || sequence.status !== 'upload') {
		return json(
			{ success: false, message: 'Sequence is invalid or in invalid state' },
			{ status: 400 }
		);
	}
	await db
		.update(schema.sequence)
		.set({ status: 'blur' })
		.where(eq(schema.sequence.id, sequence.id));
	return json({ success: true });
}) satisfies RequestHandler;
