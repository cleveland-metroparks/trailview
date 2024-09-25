import { db } from '$lib/server/db';
import { zodErrorToFormMessage } from '$lib/util';
import type { Actions } from '@sveltejs/kit';
import z from 'zod';
import * as schema from '$db/schema';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';

export const load = (async () => {
	const apiKeyQuery = await db
		.select({
			id: schema.apiKey.id,
			name: schema.apiKey.name,
			key: schema.apiKey.key,
			role: schema.apiKey.role,
			active: schema.apiKey.active,
			createdAt: schema.apiKey.createdAt
		})
		.from(schema.apiKey);
	const apiKeys = apiKeyQuery.toSorted((a, b) => {
		return a.id - b.id;
	});
	return { apiKeys: apiKeys };
}) satisfies PageServerLoad;

const createSchema = z.object({
	name: z.string().min(1).max(256),
	role: z.enum(['admin', 'standard']),
	active: z
		.literal('on')
		.optional()
		.transform((a) => (a !== undefined ? true : false))
});

const deleteSchema = z.object({
	id: z.coerce.number().int()
});

const editSchema = z.object({
	id: z.coerce.number().int(),
	name: z.string().min(1).max(256),
	role: z.enum(['admin', 'standard']),
	active: z
		.literal('on')
		.optional()
		.transform((a) => (a !== undefined ? true : false))
});

export const actions = {
	create: async ({ request }) => {
		const form = Object.fromEntries(await request.formData());
		const createParse = createSchema.safeParse(form);
		if (createParse.success === false) {
			return zodErrorToFormMessage(createParse.error);
		}
		await db.insert(schema.apiKey).values({
			name: createParse.data.name,
			active: createParse.data.active,
			role: createParse.data.role,
			key: uuidv4()
		});
		return { success: true };
	},
	edit: async ({ request }) => {
		const form = Object.fromEntries(await request.formData());
		const editParse = editSchema.safeParse(form);
		if (editParse.success === false) {
			return zodErrorToFormMessage(editParse.error);
		}
		await db
			.update(schema.apiKey)
			.set({ active: editParse.data.active, name: editParse.data.name, role: editParse.data.role })
			.where(eq(schema.apiKey.id, editParse.data.id));
		return { success: true };
	},
	delete: async ({ request }) => {
		const form = Object.fromEntries(await request.formData());
		const deleteParse = deleteSchema.safeParse(form);
		if (deleteParse.success === false) {
			return zodErrorToFormMessage(deleteParse.error);
		}
		await db.delete(schema.apiKey).where(eq(schema.apiKey.id, deleteParse.data.id));
		return { success: true };
	}
} satisfies Actions;
