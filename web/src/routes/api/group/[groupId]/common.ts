import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';

export type GroupData = {
	id: number;
	name: string;
	images: {
		id: string;
	}[];
};

export async function getGroup(id: number, includeAll: boolean): Promise<Error | GroupData> {
	const groupQuery = await db
		.select({ id: schema.group.id, name: schema.group.name })
		.from(schema.group)
		.where(eq(schema.group.id, id));
	const group = groupQuery.at(0);
	if (group === undefined) {
		return new Error('Invalid group id');
	}
	const groupImageQuery = db
		.$with('groupImage')
		.as(
			db
				.select({ groupImageId: schema.imageGroupRelation.imageId })
				.from(schema.imageGroupRelation)
				.where(eq(schema.imageGroupRelation.groupId, group.id))
		);
	const imageQuery =
		includeAll === true
			? await db
					.with(groupImageQuery)
					.select({ id: schema.image.id })
					.from(schema.image)
					.where(eq(schema.image.public, true))
					.innerJoin(groupImageQuery, eq(groupImageQuery.groupImageId, schema.image.id))
			: await db
					.with(groupImageQuery)
					.select({ id: schema.image.id })
					.from(schema.image)
					.innerJoin(groupImageQuery, eq(groupImageQuery.groupImageId, schema.image.id));
	return {
		id: group.id,
		name: group.name,
		images: imageQuery
	};
}
