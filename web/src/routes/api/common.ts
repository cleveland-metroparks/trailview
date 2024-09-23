import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { and, eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { isSessionValid } from '$lib/server/auth-entra';
import { env } from '$env/dynamic/private';

export type ImageData = {
	id: string;
	sequenceId: number;
	coordinates: [number, number];
	bearing: number;
	flipped: boolean;
	pitchCorrection: number;
	public: boolean;
	createdAt: Date;
	shtHash: string;
};

export const imageQuerySelect = {
	id: schema.image.id,
	sequenceId: schema.image.sequenceId,
	coordinates: schema.image.coordinates,
	bearing: schema.image.bearing,
	flipped: schema.image.flipped,
	pitchCorrection: schema.image.pitchCorrection,
	public: schema.image.public,
	createdAt: schema.image.createdAt,
	shtHash: schema.image.shtHash
};

const apiHeaderKey = 'X-API-Key';

// export async function isApiAuth(cookies: Cookies, headers: Headers): Promise<boolean> {
// 	const headerValue = headers.get(apiHeaderKey);
// 	if (headerValue === null) {
// 		return await isSessionValid(cookies);
// 	}
// 	const keyParse = z.string().uuid().safeParse(headerValue);
// 	if (keyParse.success !== true) {
// 		return false;
// 	}
// 	const apiKeyQuery = await db
// 		.select({})
// 		.from(schema.apiKey)
// 		.where(and(eq(schema.apiKey.key, headerValue), eq(schema.apiKey.active, true)));
// 	const apiKey = apiKeyQuery.at(0);
// 	if (apiKey === undefined) {
// 		return false;
// 	}
// 	return true;
// }

export async function isApiAdmin(cookies: Cookies, headers: Headers): Promise<boolean> {
	if ((await isSessionValid(cookies)) === true) {
		return true;
	}
	const headerValue = headers.get(apiHeaderKey);
	if (headerValue === null) {
		return false;
	}
	if (env.TV_WEB_PROCESS_SECRET !== undefined && headerValue === env.TV_WEB_PROCESS_SECRET) {
		return true;
	}
	const apiKeyQuery = await db
		.select({ role: schema.apiKey.role })
		.from(schema.apiKey)
		.where(and(eq(schema.apiKey.key, headerValue), eq(schema.apiKey.active, true)));
	const apiKey = apiKeyQuery.at(0);
	if (apiKey === undefined) {
		return false;
	}
	return apiKey.role === 'admin';
}
