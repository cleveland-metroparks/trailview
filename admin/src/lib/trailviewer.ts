import CheapRuler from 'cheap-ruler';

declare const pannellum: any;
type PannellumViewer = any;

export interface TrailViewerOptions {
	baseUrl: string;
	navArrowMinAngle: number;
	navArrowMaxAngle: number;
	imageFetchType: 'standard' | 'all';
}

export const defaultTrailViewerOptions: TrailViewerOptions = {
	baseUrl: 'https://trailview.cmparks.net',
	navArrowMinAngle: -25,
	navArrowMaxAngle: -20,
	imageFetchType: 'standard'
};

function angle180to360(angle: number): number {
	if (angle < 0) {
		angle = 360 + angle;
	}
	return angle;
}

function angle360to180(angle: number): number {
	if (angle > 180) {
		angle = -(360 - angle);
	}
	return angle;
}

function customMod(a: number, b: number): number {
	return a - Math.floor(a / b) * b;
}

export class TrailViewer {
	private _options: TrailViewerOptions = defaultTrailViewerOptions;
	private _panViewer: PannellumViewer | undefined;
	private _infoJson: any = undefined;
	private _geo = { latitude: 0, longitude: 0 };
	private _prevNorthOffset = 0;
	private _prevYaw = 0;
	private _currImg: any;
	private _dataArr: any[] | undefined;
	private _dataIndex: any = {};
	private _sceneList: any[] = [];
	private _hotSpotList: any[] = [];
	private _prevImg: string | null = null;
	private _prevNavClickedYaw = 0;
	private _initLat: number | undefined;
	private _initLng: number | undefined;
	private optimalDist = 4;
	private neighborDistCutoff = 10;
	private pruneAngle = 25;
	private _firstScene: any = null;

	constructor(
		options: TrailViewerOptions = defaultTrailViewerOptions,
		initImageId: string | undefined = undefined,
		data = undefined,
		lat = undefined,
		lng = undefined
	) {
		this._options = options;
		this._currImg = initImageId;
		if (data !== undefined) {
			this._dataArr = data;
		} else {
			this._dataArr = undefined;
			this._fetchData().then((dataArr: any[]) => {
				this._dataArr = dataArr;
				this._initViewer();
				// Create index for quick lookup of data points
				// Format: {'imageID': index, '27fjei9djc': 8, ...}
				for (let i = 0; i < this._dataArr.length; i++) {
					this._dataIndex[this._dataArr[i]['id']] = i;
				}
				if (this._currImg) {
					this.goToImageID(this._currImg['id'], true);
				}
			});
		}
		return this;
	}

	setData(data: any[]) {
		this._dataArr = data;
		// Create index for quick lookup of data points
		// Format: {'imageID': index, '27fjei9djc': 8, ...}
		for (let i = 0; i < this._dataArr.length; i++) {
			this._dataIndex[this._dataArr[i]['id']] = i;
		}
		// Remove all hotspots
		for (let i = 0; i < this._hotSpotList.length; i++) {
			this._panViewer.removeHotSpot(this._hotSpotList[i], this._currImg);
		}
		// Remove all scenes
		for (let i = 0; i < this._sceneList.length; i++) {
			this._panViewer.removeScene(this._sceneList[i]);
		}
		this._addSceneToViewer(this._dataArr[this._dataIndex[this._currImg['id']]]);
		this.goToImageID(this._currImg['id']);
	}

	getCurrentImageID(): string | undefined {
		if (this._currImg) {
			return this._currImg['id'];
		}
	}

	getFlipped(): boolean {
		return this._currImg['flipped'];
	}

	getCurrentSequenceName(): string {
		return this._currImg['sequenceName'];
	}

	private _createViewerConfig(firstScene: string): any {
		const config = {
			default: {
				firstScene: firstScene,
				sceneFadeDuration: 1500,
				compass: false,
				autoLoad: true,
				showControls: false,
				crossOrigin: 'use-credentials'
			},
			scenes: {}
		};
		return config;
	}

	private _addSceneToConfig(config: any, scene: any): any {
		config['scenes'][String(scene['id'])] = {
			horizonPitch: scene['pitchCorrection'],
			hfov: 120,
			yaw: 0,
			northOffset: scene['bearing'],
			type: 'multires',
			multiRes: {
				basePath:
					this._options.baseUrl + '/trails/' + scene['sequenceName'] + '/img/' + scene['id'],
				path: '/%l/%s%y_%x',
				extension: 'jpg',
				tileResolution: 512,
				maxLevel: 3,
				cubeResolution: 1832
			}
		};
		return config;
	}

	private _addSceneToViewer(scene: any, shtHash: string | null = null) {
		this._sceneList.push(scene['id']);
		let horizonPitch = scene['pitchCorrection'];
		let yaw = 180;
		if (!scene['flipped']) {
			horizonPitch *= -1;
			yaw = 0;
		}
		let bearing = scene['bearing'];
		if (!scene['flipped']) {
			bearing = customMod(bearing + 180, 360);
		}
		const config = {
			horizonPitch: horizonPitch,
			hfov: 120,
			yaw: yaw,
			northOffset: bearing,
			type: 'multires',
			multiRes: {
				basePath:
					this._options.baseUrl + '/trails/' + scene['sequenceName'] + '/img/' + scene['id'],
				path: '/%l/%s%y_%x',
				fallbackPath: '/fallback/%s',
				extension: 'jpg',
				tileResolution: 512,
				maxLevel: 3,
				cubeResolution: 1832,
				shtHash
			}
		};
		if (shtHash != null) {
			config.multiRes.shtHash = shtHash;
		}
		this._panViewer.addScene(scene['id'], config);
	}

	/**
	 * Adds navigation arrows to viewer from neighbors array
	 * */
	private async _addNeighborsToViewer(neighbors: any[], flipped = false) {
		for (let i = 0; i < neighbors.length; i++) {
			const req = await fetch(`${this._options.baseUrl}/api/preview/${neighbors[i]['id']}`, {
				method: 'GET'
			});
			const data = await req.json();

			this._addSceneToViewer(neighbors[i], data['preview']);
			this._hotSpotList.push(neighbors[i]['id']);
			const min = this._options.navArrowMinAngle;
			const max = this._options.navArrowMaxAngle;
			const pitch = -(max - min - (neighbors[i]['distance'] * (max - min)) / 9.0) + max;
			let yaw = neighbors[i]['neighborBearing'];
			if (!flipped) {
				yaw = customMod(neighbors[i]['neighborBearing'] + 180, 360);
			}
			this._panViewer.addHotSpot({
				id: neighbors[i]['id'],
				pitch: pitch, //-25
				yaw: yaw,
				cssClass: 'custom-hotspot',
				type: 'scene',
				clickHandlerFunc: this._onNavArrowClick,
				clickHandlerArgs: {
					this: this,
					id: neighbors[i]['id'],
					yaw: neighbors[i]['neighborBearing'],
					pitch: pitch
				}
			});
		}
		// TODO: on-arrow-add
	}

	/**
	 * Called when a navigation arrow is clicked
	 */
	private _onNavArrowClick(evt: Event, info: any) {
		info['this']._prevNavClickedYaw = info.yaw;
		info['this']._panViewer.loadScene(info.id, 'same', 'same', 'same');
	}

	private _customMod(a: number, b: number): number {
		return a - Math.floor(a / b) * b;
	}

	/**
	 * Calculates neighbors based on provided imageID
	 * Returns array of scene-like objects
	 */
	private _getNeighbors(scene: any): any[] | null {
		const ruler = new CheapRuler(41, 'meters');
		let neighbors: any[] = [];
		if (this._dataArr === undefined) {
			return null;
		}
		for (let p = 0; p < this._dataArr.length; p++) {
			if (this._dataArr[p].id == scene['id']) {
				continue;
			}
			const distance = ruler.distance(
				[scene['longitude'], scene['latitude']],
				[this._dataArr[p].longitude, this._dataArr[p].latitude]
			);
			if (distance <= this.neighborDistCutoff) {
				let brng = ruler.bearing(
					[scene['longitude'], scene['latitude']],
					[this._dataArr[p].longitude, this._dataArr[p].latitude]
				);
				if (brng < 0) {
					brng += 360;
				}
				const bearing = this._customMod(this._customMod(brng - scene['bearing'], 360) + 180, 360);
				let skip = false;
				for (let n = 0; n < neighbors.length; n++) {
					const neighbor = neighbors[n];
					const diff = this._customMod(neighbor.neighborBearing - bearing + 180, 360) - 180;
					if (Math.abs(diff) < this.pruneAngle) {
						if (
							Math.abs(this.optimalDist - distance) < Math.abs(this.optimalDist - neighbor.distance)
						) {
							neighbors[n] = null;
						} else {
							skip = true;
						}
					}
				}
				neighbors = neighbors.filter(function (n) {
					return n != null;
				});
				if (skip == false) {
					neighbors.push({
						sequenceName: this._dataArr[p].sequenceName,
						id: this._dataArr[p].id,
						bearing: this._dataArr[p].bearing,
						neighborBearing: bearing,
						flipped: this._dataArr[p].flipped,
						distance: distance,
						latitude: this._dataArr[p].latitude,
						longitude: this._dataArr[p].longitude,
						shtHash: this._dataArr[p].shtHash,
						pitchCorrection: this._dataArr[p].pitchCorrection
					});
				}
			}
		}
		return neighbors;
	}

	private _initViewer() {
		if (this._dataArr === undefined) {
			console.error('Cannot initialize viewer because dataArr is undefined');
			return;
		}
		// Create index for quick lookup of data points
		// Format: {'imageID': index, '27fjei9djc': 8, ...}
		for (let i = 0; i < this._dataArr.length; i++) {
			this._dataIndex[this._dataArr[i]['id']] = i;
		}

		// Set firstScene, if not specified then use first scene in data array
		if (this._currImg == null) {
			if (this._initLat && this._initLng) {
				this._firstScene = this.getNearestImageId(
					this._initLat,
					this._initLng,
					Number.MAX_SAFE_INTEGER
				);
			} else {
				this._firstScene = this._dataArr[0]['id'];
			}
		} else {
			this._firstScene = this._currImg;
		}
		let config = this._createViewerConfig(this._firstScene);
		this._currImg = this._dataArr[this._dataIndex[this._firstScene]];
		config = this._addSceneToConfig(config, this._currImg);
		this._sceneList.push(this._currImg['id']);
		this._panViewer = pannellum.viewer('panorama', config);

		// Set up onSceneChange event listener
		this._panViewer.on('scenechange', (imgId: any) => {
			this._onSceneChange(imgId);
		});
		this._onSceneChange(this._panViewer.getScene());

		if (this._currImg.flipped) {
			this._panViewer.setYaw(180, false);
		} else {
			this._panViewer.setYaw(0, false);
		}

		const neighbors = this._getNeighbors(this._currImg);
		if (neighbors === null) {
			return;
		}
		for (let i = 0; i < this._hotSpotList.length; i++) {
			this._panViewer.removeHotSpot(this._hotSpotList[i]);
		}
		this._addNeighborsToViewer(neighbors, this._currImg.flipped);
		//TODO on-init-done
	}

	/**
	 * Fetches data and then initializes viewer
	 * @private
	 */
	private async _fetchData(): Promise<any[]> {
		if (this._options.imageFetchType == 'standard') {
			const res = await fetch(`${this._options.baseUrl}/api/images/standard`, { method: 'GET' });
			const data = await res.json();
			return new Promise((resolve) => {
				resolve(data['imagesStandard']);
			});
		} else {
			const res = await fetch(`${this._options.baseUrl}/api/images/all`, { method: 'GET' });
			const data = await res.json();
			this._dataArr = data['imagesAll'];
			return new Promise((resolve) => {
				resolve(data['imagesAll']);
			});
		}
	}

	/**
	 * Returns nearest hotspot from yaw angle
	 * Returns nearest hotspot config
	 */
	private _getNearestHotspot(yaw: number): any {
		const config = this._panViewer.getConfig();
		const hotspots = config['hotSpots'];
		if (!hotspots) {
			return null;
		}
		let nearest = hotspots[0];
		let nearestDiff;
		for (let i = 0; i < hotspots.length; i++) {
			const diff = Math.abs(this._customMod(angle180to360(hotspots[i].yaw) - yaw + 180, 360) - 180);
			nearestDiff = Math.abs(this._customMod(angle180to360(nearest.yaw) - yaw + 180, 360) - 180);
			if (diff < nearestDiff) {
				nearest = hotspots[i];
				nearestDiff = diff;
			}
		}
		return nearest;
	}

	private _onSceneChange(img: string) {
		if (this._dataArr === undefined) {
			console.error('Error on scene change, dataArr is undefined');
			return;
		}
		this._currImg = this._dataArr[this._dataIndex[img]];

		// Keep the same bearing on scene change
		this._prevYaw = this._panViewer.getYaw();
		const newYaw =
			(((this._prevNorthOffset - this._panViewer.getNorthOffset()) % 360) + this._prevYaw) % 360;
		this._panViewer.setYaw(newYaw, false);
		this._prevNorthOffset = this._panViewer.getNorthOffset();

		// Update geo
		this._geo['latitude'] = this._dataArr[this._dataIndex[img]]['latitude'];
		this._geo['longitude'] = this._dataArr[this._dataIndex[img]]['longitude'];

		// TODO: on-geo-change

		// Remove previous hotspots
		for (let i = 0; i < this._hotSpotList.length; i++) {
			this._panViewer.removeHotSpot(this._hotSpotList[i], this._prevImg);
		}
		this._hotSpotList = [];
		const hotspots = document.getElementsByClassName('pnlm-hotspot-base');
		for (let i = 0; i < hotspots.length; i++) {
			hotspots[i].remove();
		}

		// Remove scenes that are not in range
		const neighbors = this._getNeighbors(this._dataArr[this._dataIndex[img]]);
		const visibleScenes = [img];
		if (neighbors !== null) {
			for (let i = 0; i < neighbors.length; i++) {
				visibleScenes.push(neighbors[i]['id']);
			}
		}
		for (let i = 0; i < this._sceneList.length; i++) {
			if (!visibleScenes.includes(this._sceneList[i])) {
				this._panViewer.removeScene(this._sceneList[i]);
			}
		}
		this._sceneList = visibleScenes;
		this._prevImg = this._currImg;

		// Add nav arrows
		if (neighbors !== null) {
			this._addNeighborsToViewer(neighbors, this._currImg.flipped);
		}

		// TODO: on-scene-change
	}

	/**
	 * Gets nearest image ID to specified coordinates
	 * Returns null if not in cutoff, else returns image id
	 */
	getNearestImageId(lat: number, lng: number, distCutoff = 10): string | null {
		const ruler = new CheapRuler(41, 'meters');
		let minDist = Number.MAX_SAFE_INTEGER;
		let minId: string | null = null;
		if (this._dataArr === undefined) {
			return null;
		}
		for (let i = 0; i < this._dataArr.length; i++) {
			const dist = ruler.distance(
				[lng, lat],
				[this._dataArr[i].longitude, this._dataArr[i].latitude]
			);
			if (dist < distCutoff) {
				if (dist < minDist) {
					minId = this._dataArr[i].id;
					minDist = dist;
				}
			}
		}
		return minId;
	}

	getImageGeo(): { latitude: number; longitude: number } {
		return this._geo;
	}

	destroy() {
		if (this._panViewer !== null) {
			this._panViewer.destroy();
		}
	}

	getBearing(): number {
		return (this._panViewer.getNorthOffset() + this._panViewer.getYaw() + 180) % 360;
	}

	/**
	 * Creates info in viewer
	 */
	private _createLocalInfo(infoJson: any) {
		if (this._infoJson != null) {
			for (let i = 0; i < this._infoJson['ImgInfo'].length; i++) {
				if (this._panViewer != null) {
					this._panViewer.removeHotSpot(
						this._infoJson['ImgInfo'][i]['ID'],
						this._infoJson['ImgInfo'][i]['ImageID']
					);
				}
			}
		}
		this._infoJson = infoJson;
		for (let i = 0; i < infoJson['ImgInfo'].length; i++) {
			const info = infoJson['ImgInfo'][i];
			if (this._panViewer != null) {
				this._panViewer.addHotSpot(
					{
						id: info['ID'],
						pitch: info['Pitch'],
						yaw: info['Yaw'],
						type: 'info',
						text: info['HoverText'],
						clickHandlerFunc: this._onHotSpotClicked,
						clickHandlerArgs: [this, info['ID']]
					},
					info['ImageID']
				);
			}
		}
	}

	/**
	 * Called when info is clicked
	 */
	private _onHotSpotClicked(evt: Event, info: any) {
		if ('onHotSpotClickFunc' in info[0]._options) {
			info[0]._options.onHotSpotClickFunc(info[1]);
		}
	}

	async goToImageID(imageID: string, reset = false) {
		if (reset || !this._sceneList.includes(imageID)) {
			if (reset) {
				for (let i = 0; i < this._sceneList.length; i++) {
					this._panViewer.removeScene(this._sceneList[i]);
				}
				this._sceneList = [];
			}
			const res = await fetch(`${this._options.baseUrl}/api/preview/${imageID}`, { method: 'GET' });
			const data = await res.json();

			if (this._dataArr !== undefined) {
				this._addSceneToViewer(this._dataArr[this._dataIndex[imageID]], data['preview']);
			}
			this._panViewer.loadScene(imageID, 'same', 'same', 'same');
		} else {
			this._panViewer.loadScene(imageID, 'same', 'same', 'same');
		}
		return this;
	}
}
