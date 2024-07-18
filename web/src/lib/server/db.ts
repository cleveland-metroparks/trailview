import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../../db/schema';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

export const db = (
	building === false
		? drizzle(
				postgres({
					user: env.TV_DB_USER,
					password: env.TV_DB_PASSWORD,
					host: env.TV_DB_HOST,
					port: parseInt(env.TV_DB_PORT),
					database: env.TV_DB_DATABASE
				}),
				{ schema }
			)
		: undefined
) as ReturnType<typeof drizzle>;
