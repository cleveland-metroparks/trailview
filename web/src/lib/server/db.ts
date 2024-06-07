import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../../db/schema';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

export const db = (
	building === false ? drizzle(postgres(env.DATABASE_URL), { schema }) : undefined
) as ReturnType<typeof drizzle>;
