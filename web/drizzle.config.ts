import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './db/schema.ts',
	out: './db',
	dialect: 'postgresql',
	dbCredentials: {
		user: process.env.TV_DB_USER!,
		password: process.env.TV_DB_PASSWORD!,
		host: process.env.TV_DB_HOST!,
		port: parseInt(process.env.TV_DB_PORT!),
		database: process.env.TV_DB_DATABASE!
	},
	extensionsFilters: ['postgis'],
	tablesFilter: ['']
});
