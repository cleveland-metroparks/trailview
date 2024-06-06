import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './db/schema.ts',
	out: './db',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL! },
	extensionsFilters: ['postgis'],
	tablesFilter: ['']
});
