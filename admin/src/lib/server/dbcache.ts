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

async function refreshImageData() {
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
	return new Promise<void>((resolve) => {
		setTimeout(resolve, 1000 * 60 * 15); // 15 minutes
	});
}

(async () => {
	// eslint-disable-next-line no-constant-condition
	while (true) {
		await refreshImageData();
	}
})();
