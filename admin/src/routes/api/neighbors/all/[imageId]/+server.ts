// import type { RequestHandler } from '@sveltejs/kit';
// import CheapRuler from 'cheap-ruler';

// const ruler = new CheapRuler(41, 'meters');

// export const GET = (async ({ params }) => {
// 	const neighbors: unknown = [];
// 	if (this._dataArr === undefined) {
// 		throw new Error('Cannot get neighbors as dataArr is undefined');
// 	}
// 	for (let p = 0; p < this._dataArr.length; p++) {
// 		if (this._dataArr[p].id == scene['id']) {
// 			continue;
// 		}
// 		const distance = ruler.distance(
// 			[scene['longitude'], scene['latitude']],
// 			[this._dataArr[p].longitude, this._dataArr[p].latitude]
// 		);
// 		if (distance <= this.neighborDistCutoff) {
// 			let brng = ruler.bearing(
// 				[scene['longitude'], scene['latitude']],
// 				[this._dataArr[p].longitude, this._dataArr[p].latitude]
// 			);
// 			if (brng < 0) {
// 				brng += 360;
// 			}
// 			const bearing = this._customMod(this._customMod(brng - scene['bearing'], 360) + 180, 360);
// 			let skip = false;
// 			for (let n = 0; n < neighbors.length; n++) {
// 				const neighbor = neighbors[n];
// 				if (neighbor === undefined) {
// 					continue;
// 				}
// 				const diff = this._customMod(neighbor.neighborBearing - bearing + 180, 360) - 180;
// 				if (Math.abs(diff) < this.pruneAngle) {
// 					if (
// 						Math.abs(this.optimalDist - distance) < Math.abs(this.optimalDist - neighbor.distance)
// 					) {
// 						neighbors[n] = undefined;
// 					} else {
// 						skip = true;
// 					}
// 				}
// 			}
// 			if (skip == false) {
// 				neighbors.push({
// 					sequenceId: this._dataArr[p].sequenceId,
// 					id: this._dataArr[p].id,
// 					bearing: this._dataArr[p].bearing,
// 					neighborBearing: bearing,
// 					flipped: this._dataArr[p].flipped,
// 					distance: distance,
// 					latitude: this._dataArr[p].latitude,
// 					longitude: this._dataArr[p].longitude,
// 					shtHash: this._dataArr[p].shtHash,
// 					pitchCorrection: this._dataArr[p].pitchCorrection,
// 					visibility: this._dataArr[p].visibility
// 				});
// 			}
// 		}
// 	}
// 	const filteredNeighbors = neighbors.filter((neighbor) => {
// 		return neighbor !== undefined;
// 	}) as Neighbor[];
// 	return filteredNeighbors;
// }) satisfies RequestHandler;
