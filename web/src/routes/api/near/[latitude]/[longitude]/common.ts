import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { sql } from 'drizzle-orm';
import { imageQuerySelect, type ImageData } from '$api/common';

export type GetResType =
	| { success: false; message: string }
	| { success: true; data: ImageData & { distance: number } };

export async function queryNearestImage(params: {
	includePrivate: boolean;
	coordinates: [number, number];
}): Promise<(ImageData & { distance: number }) | null> {
	const imageQuery = await db
		.select({
			...imageQuerySelect,
			distance: sql<number>`ST_Distance(coordinates::geography,
				ST_SETSRID(ST_MakePoint(${params.coordinates[0]}, ${params.coordinates[1]}),4326)::geography) 
				AS distance`
		})
		.from(schema.image)
		.orderBy(sql`distance`)
		.limit(1);
	const image = imageQuery.at(0);
	if (image === undefined) {
		return null;
	}
	return image;
}
