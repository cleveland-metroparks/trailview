import { db } from '$lib/server/db';
import * as schema from '$db/schema';
import { eq } from 'drizzle-orm';

export let standardImageData:
	| {
			id: string;
			sequenceId: number;
			latitude: number;
			longitude: number;
			bearing: number;
			flipped: boolean;
			pitchCorrection: number;
			public: boolean;
			createdAt: Date;
	  }[]
	| undefined;

export let allImageData:
	| {
			id: string;
			pitchCorrection: number;
			bearing: number;
			longitude: number;
			latitude: number;
			flipped: boolean;
			public: boolean;
			sequenceId: number;
			createdAt: Date;
	  }[]
	| undefined;

export let imagePreviews: Map<string, string>;

export let groupData: { groupId: number; imageId: string }[] | undefined;

export async function refreshImageData(once: boolean) {
	const previewsQuery = await db
		.select({ id: schema.image.id, shtHash: schema.image.shtHash })
		.from(schema.image);
	imagePreviews = new Map();
	previewsQuery.forEach((preview) => {
		imagePreviews.set(preview.id, preview.shtHash);
	});
	allImageData = await db
		.select({
			id: schema.image.id,
			sequenceId: schema.image.sequenceId,
			latitude: schema.image.latitude,
			longitude: schema.image.longitude,
			bearing: schema.image.bearing,
			flipped: schema.image.flipped,
			pitchCorrection: schema.image.pitchCorrection,
			public: schema.image.public,
			createdAt: schema.image.createdAt
		})
		.from(schema.image);
	standardImageData = await db
		.select({
			id: schema.image.id,
			sequenceId: schema.image.sequenceId,
			latitude: schema.image.latitude,
			longitude: schema.image.longitude,
			bearing: schema.image.bearing,
			flipped: schema.image.flipped,
			pitchCorrection: schema.image.pitchCorrection,
			public: schema.image.public,
			createdAt: schema.image.createdAt
		})
		.from(schema.image)
		.where(eq(schema.image.public, true));

	groupData = await db
		.select({
			imageId: schema.imageGroupRelation.imageId,
			groupId: schema.imageGroupRelation.groupId
		})
		.from(schema.imageGroupRelation);

	if (once) {
		return;
	} else {
		return new Promise<void>((resolve) => {
			setTimeout(resolve, 1000 * 60 * 10); // 10 minutes
		});
	}
}

(async () => {
	if (process.env.INIT !== undefined) {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			await refreshImageData(false);
		}
	}
})();
