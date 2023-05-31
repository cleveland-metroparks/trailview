import { db } from './prisma';

export let standardImageData: {
	id: string;
	sequenceId: number;
	latitude: number;
	longitude: number;
	bearing: number;
	flipped: boolean;
	pitchCorrection: number;
	visibility: boolean;
}[];

export let allImageData: {
	id: string;
	pitchCorrection: number;
	bearing: number;
	longitude: number;
	latitude: number;
	flipped: boolean;
	visibility: boolean;
	sequenceId: number;
}[];

export let imagePreviews: Map<string, string>;

export async function refreshImageData(once: boolean) {
	const previews = await db.image.findMany({ select: { id: true, shtHash: true } });
	imagePreviews = new Map();
	previews.forEach((preview) => {
		imagePreviews.set(preview.id, preview.shtHash);
	});
	allImageData = await db.image.findMany({
		select: {
			id: true,
			sequenceId: true,
			latitude: true,
			longitude: true,
			bearing: true,
			flipped: true,
			pitchCorrection: true,
			visibility: true
		}
	});
	standardImageData = await db.image.findMany({
		where: { visibility: true },
		select: {
			id: true,
			sequenceId: true,
			latitude: true,
			longitude: true,
			bearing: true,
			flipped: true,
			pitchCorrection: true,
			visibility: true
		}
	});
	if (once) {
		return;
	} else {
		return new Promise<void>((resolve) => {
			setTimeout(resolve, 1000 * 60 * 15); // 15 minutes
		});
	}
}

(async () => {
	// eslint-disable-next-line no-constant-condition
	while (true) {
		await refreshImageData(false);
	}
})();
