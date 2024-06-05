import {
	unique,
	pgTable,
	serial,
	uuid,
	varchar,
	integer,
	char,
	timestamp,
	real,
	boolean,
	pgEnum,
	index
} from 'drizzle-orm/pg-core';

export const adminAccount = pgTable('admin_account', {
	id: serial('id').notNull().primaryKey(),
	username: varchar('username', { length: 256 }).notNull().unique(),
	password: varchar('password', { length: 256 }).notNull()
});

export const session = pgTable('session', {
	id: uuid('id').notNull().primaryKey(),
	adminAccountId: integer('admin_account_id')
		.notNull()
		.references(() => adminAccount.id),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const status = pgEnum('status', ['upload', 'blur', 'tile', 'sequence', 'done']);

export const sequence = pgTable('sequence', {
	id: serial('id').notNull().primaryKey(),
	name: varchar('name', { length: 256 }).notNull().unique(),
	status: status('status').notNull(),
	toDelete: boolean('to_delete').notNull().default(false),
	public: boolean('public').notNull().default(false),
	mapsApiTrailId: integer('maps_api_trail_id')
});

export const image = pgTable('image', {
	id: char('id', { length: 32 }).notNull().primaryKey(),
	originalLatitude: real('original_latitude').notNull(),
	originalLongitude: real('original_longitude').notNull(),
	latitude: real('latitude').notNull(),
	longitude: real('longitude').notNull(),
	bearing: real('bearing').notNull(),
	flipped: boolean('flipped').notNull(),
	shtHash: char('sht_hash', { length: 74 }).notNull(),
	pitchCorrection: real('pitch_correction').notNull(),
	public: boolean('public').notNull(),
	sequenceId: integer('sequence_id')
		.notNull()
		.references(() => sequence.id),
	createdAt: timestamp('created_at', { mode: 'date' }).notNull()
});

export const group = pgTable('group', {
	id: serial('id').notNull().primaryKey(),
	name: varchar('name', { length: 256 }).notNull().unique()
});

export const analytics = pgTable(
	'analytics',
	{
		id: serial('id').notNull().primaryKey(),
		imageId: char('image_id', { length: 32 })
			.notNull()
			.references(() => image.id),
		date: timestamp('date', { mode: 'date' }).notNull(),
		count: integer('count').notNull()
	},
	(table) => ({
		dateIndex: index().on(table.date),
		uniqueImageIdDate: unique().on(table.imageId, table.date)
	})
);

export const imageGroupRelation = pgTable(
	'image_group_relation',
	{
		id: serial('id').notNull().primaryKey(),
		imageId: char('image_id', { length: 32 })
			.notNull()
			.references(() => image.id),
		groupId: integer('group_id')
			.notNull()
			.references(() => group.id)
	},
	(table) => ({
		uniqueImageIdGroupId: unique().on(table.imageId, table.groupId)
	})
);

export const apiRole = pgEnum('apiRole', ['standard', 'admin']);

export const apiKey = pgTable('api_key', {
	id: serial('id').notNull().primaryKey(),
	name: varchar('name', { length: 256 }).notNull(),
	key: uuid('key').notNull(),
	role: apiRole('role').notNull(),
	active: boolean('active').notNull(),
	createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow()
});
