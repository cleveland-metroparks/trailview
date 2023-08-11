import CheapRuler from 'cheap-ruler';

interface Image {
	id: string;
	sequenceId: number;
	latitude: number;
	longitude: number;
	bearing: number;
	flipped: boolean;
	pitchCorrection: number;
	createdAt: Date | null;
	visibility: boolean;
}

const ruler = new CheapRuler(41, 'meters');

export async function getNearestImage(
	imageData: Image[],
	latitude: number,
	longitude: number
): Promise<(Image & { distance: number }) | undefined> {
	let nearestDistance = Number.MAX_VALUE;
	let nearestImage: Image | null = null;
	for (let i = 0; i < imageData.length; i++) {
		const image = imageData[i];
		const distance = ruler.distance([image.longitude, image.latitude], [longitude, latitude]);
		if (nearestImage === null || distance < nearestDistance) {
			nearestDistance = distance;
			nearestImage = image;
		}
	}
	if (nearestImage === null) {
		return undefined;
	}
	return { ...nearestImage, distance: nearestDistance };
}
