import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';
import cron from 'node-cron';

export type ImageLocationCacheType = { id: string; latitude: number; longitude: number };

let imageLocationCachePublic: ImageLocationCacheType[] | null = null;
let imageLocationCacheAll: ImageLocationCacheType[] | null = null;

export async function refreshCachedImageLocations() {
	imageLocationCachePublic = await db
		.select({
			id: schema.image.id,
			latitude: schema.image.latitude,
			longitude: schema.image.longitude
		})
		.from(schema.image)
		.where(eq(schema.image.public, true));
	imageLocationCacheAll = await db
		.select({
			id: schema.image.id,
			latitude: schema.image.latitude,
			longitude: schema.image.longitude
		})
		.from(schema.image);
}

export async function getCachedImageLocations(params: {
	includePrivate: boolean;
}): Promise<ImageLocationCacheType[]> {
	if (imageLocationCacheAll === null || imageLocationCachePublic === null) {
		refreshCachedImageLocations();
	}
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return params.includePrivate === true ? imageLocationCacheAll! : imageLocationCachePublic!;
}

(async () => {
	if (process.env.INIT !== undefined) {
		await refreshCachedImageLocations();
		cron.schedule('0 * * * *', async () => {
			await refreshCachedImageLocations();
		});
	}
})();
