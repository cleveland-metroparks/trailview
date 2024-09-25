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
	index,
	geometry
} from 'drizzle-orm/pg-core';

export const status = pgEnum('status', ['upload', 'blur', 'tile', 'manifest', 'done']);

export const sequence = pgTable('sequence', {
	id: serial('id').notNull().primaryKey(),
	name: varchar('name', { length: 256 }).notNull().unique(),
	status: status('status').notNull(),
	toDelete: boolean('to_delete').notNull().default(false),
	public: boolean('public').notNull().default(false),
	mapsApiTrailId: integer('maps_api_trail_id')
});

export const image = pgTable(
	'image',
	{
		id: char('id', { length: 32 }).notNull().primaryKey(),
		originalLatitude: real('original_latitude').notNull(),
		originalLongitude: real('original_longitude').notNull(),
		bearing: real('bearing').notNull(),
		flipped: boolean('flipped').notNull(),
		shtHash: char('sht_hash', { length: 74 }).notNull(),
		pitchCorrection: real('pitch_correction').notNull(),
		public: boolean('public').notNull(),
		sequenceId: integer('sequence_id')
			.notNull()
			.references(() => sequence.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { mode: 'date' }).notNull(),
		coordinates: geometry('coordinates', { type: 'point', mode: 'tuple', srid: 4326 }).notNull()
	},
	(table) => {
		return {
			coordinatesIndex: index().using('gist', table.coordinates)
		};
	}
);

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
			.references(() => image.id, { onDelete: 'cascade' }),
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
			.references(() => image.id, { onDelete: 'cascade' }),
		groupId: integer('group_id')
			.notNull()
			.references(() => group.id, { onDelete: 'cascade' })
	},
	(table) => ({
		uniqueImageIdGroupId: unique().on(table.imageId, table.groupId)
	})
);

export const apiRole = pgEnum('apiRole', ['standard', 'admin']);

export const apiKey = pgTable('api_key', {
	id: serial('id').notNull().primaryKey(),
	name: varchar('name', { length: 256 }).notNull().unique(),
	key: uuid('key').notNull(),
	role: apiRole('role').notNull(),
	active: boolean('active').notNull(),
	createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow()
});
