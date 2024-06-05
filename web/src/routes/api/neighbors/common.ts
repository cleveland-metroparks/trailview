import CheapRuler from 'cheap-ruler';
import type { ImageData } from '$api/common';

export type Neighbor = ImageData & {
	distance: number;
	neighborBearing: number;
	shtHash: string | undefined;
};

const ruler = new CheapRuler(41, 'meters');
const neighborDistCutoff = 10;
const pruneAngle = 25;
const optimalDist = 4;

function customMod(a: number, b: number): number {
	return a - Math.floor(a / b) * b;
}

export function getNeighbors(params: {
	includePrivate: boolean;
	imageId: string;
	sequencesFilter: number[] | undefined;
	groupsFilter: number[] | undefined;
}): undefined | Neighbor[] {
	const neighbors: (Neighbor | null)[] = [];

	for (let p = 0; p < data.length; p++) {
		if (data[p].id === image.id) {
			continue;
		}

		const distance = ruler.distance(
			[image.longitude, image.latitude],
			[data[p].longitude, data[p].latitude]
		);
		if (distance <= neighborDistCutoff) {
			let brng = ruler.bearing(
				[image.longitude, image.latitude],
				[data[p].longitude, data[p].latitude]
			);
			if (brng < 0) {
				brng += 360;
			}
			const bearing = customMod(customMod(brng - image.bearing, 360) + 180, 360);
			let skip = false;
			for (let n = 0; n < neighbors.length; n++) {
				const neighbor = neighbors[n];
				if (neighbor === undefined) {
					continue;
				}
				const diff = customMod(neighbor.neighborBearing - bearing + 180, 360) - 180;
				if (Math.abs(diff) < pruneAngle) {
					if (Math.abs(optimalDist - distance) < Math.abs(optimalDist - neighbor.distance)) {
						neighbors[n] = undefined;
					} else {
						skip = true;
					}
				}
			}
			if (skip == false) {
				let filteredBySeq = false;
				if (sequencesFilter !== undefined) {
					if (!sequencesFilter.includes(data[p].sequenceId)) {
						filteredBySeq = true;
					}
				}

				let filteredByGroup = groupsFilter === undefined ? false : true;
				if (groupsFilter !== undefined) {
					for (const g of groupsFilter) {
						if (
							groupData.findIndex((r) => {
								return r.groupId === g && r.imageId === data[p].id;
							}) !== -1
						) {
							filteredByGroup = false;
							break;
						}
					}
				}
				if (
					(groupsFilter === undefined && sequencesFilter === undefined) ||
					(groupsFilter !== undefined && filteredByGroup === false) ||
					(sequencesFilter !== undefined && filteredBySeq === false)
				) {
					neighbors.push({
						sequenceId: data[p].sequenceId,
						id: data[p].id,
						bearing: data[p].bearing,
						neighborBearing: bearing,
						flipped: data[p].flipped,
						distance: distance,
						latitude: data[p].latitude,
						longitude: data[p].longitude,
						shtHash: imagePreviews.get(data[p].id),
						pitchCorrection: data[p].pitchCorrection,
						createdAt: data[p].createdAt,
						public: data[p].public
					});
				}
			}
		}
	}
	const filteredNeighbors = neighbors.filter((neighbor) => {
		return neighbor !== undefined;
	}) as Neighbor[];
	return filteredNeighbors;
}
