import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../../db/schema';
import postgres from 'postgres';
import { DATABASE_URL2 } from '$env/static/private';

export const db = (
	process.env.INIT !== undefined ? drizzle(postgres(DATABASE_URL2), { schema }) : undefined
) as ReturnType<typeof drizzle>;
