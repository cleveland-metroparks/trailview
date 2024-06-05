import { getCachedImageLocations } from '$lib/server/dbcache';
import CheapRuler from 'cheap-ruler';

const ruler = new CheapRuler(41, 'meters');

export async function getNearestImageId(params: {
	includePrivate: boolean;
	latitude: number;
	longitude: number;
}): Promise<{ id: string; distance: number } | null> {
	let nearestDistance = Number.MAX_VALUE;
	let nearestId: string | null = null;
	const imageLocations = await getCachedImageLocations({ includePrivate: params.includePrivate });
	for (let i = 0; i < imageLocations.length; i++) {
		const image = imageLocations[i];
		const distance = ruler.distance(
			[image.longitude, image.latitude],
			[params.longitude, params.latitude]
		);
		if (nearestId === null || distance < nearestDistance) {
			nearestDistance = distance;
			nearestId = image.id;
		}
	}
	if (nearestId === null) {
		return null;
	}
	return { id: nearestId, distance: nearestDistance };
}
