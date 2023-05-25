import CheapRuler from 'cheap-ruler';
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { EventEmitter } from 'events';

declare class PannellumViewer {
	viewer(container: HTMLElement | string, initialConfig: object): PannellumViewer;
	getYaw(): number;
	getPitch(): number;
	removeHotSpot(hotSpotId: string, sceneId?: string): boolean;
	removeScene(sceneId: string): boolean;
	addScene(sceneId: string, config: object): PannellumViewer;
	addHotSpot(hs: object, sceneId?: string): PannellumViewer;
	// eslint-disable-next-line @typescript-eslint/ban-types
	on(type: string, listener: Function): PannellumViewer;
	getScene(): string;
	setYaw(
		yaw: number,
		animated: boolean | number,
		// eslint-disable-next-line @typescript-eslint/ban-types
		callback?: Function,
		callbackArgs?: object
	): PannellumViewer;
	getNorthOffset(): number;
	destroy(): void;
	loadScene(
		sceneId: string,
		pitch?: number | 'same',
		yaw?: number | 'same',
		hfov?: number | 'same'
	): void;
	lookAt(
		pitch?: number,
		yaw?: number,
		hfov?: number,
		animated?: boolean | number,
		// eslint-disable-next-line @typescript-eslint/ban-types
		callback?: Function,
		callbackArgs?: object
	): PannellumViewer;
}

declare const pannellum: PannellumViewer;

export interface TrailViewerOptions {
	panoramaTarget: string;
	mapTarget: string;
	baseUrl: string;
	mapboxKey: string | undefined;
	navArrowMinAngle: number;
	navArrowMaxAngle: number;
	imageFetchType: 'standard' | 'all';
}

export const defaultTrailViewerOptions: TrailViewerOptions = {
	panoramaTarget: 'trailview_panorama',
	mapTarget: 'trailview_map',
	baseUrl: 'https://trailview.cmparks.net',
	mapboxKey: undefined,
	navArrowMinAngle: -25,
	navArrowMaxAngle: -20,
	imageFetchType: 'standard'
};

interface HTMLNavArrowElement extends HTMLImageElement {
	yaw: number;
	imageId: string;
}

export function angle180to360(angle: number): number {
	if (angle < 0) {
		angle = 360 + angle;
	}
	return angle;
}

export function angle360to180(angle: number): number {
	if (angle > 180) {
		angle = -(360 - angle);
	}
	return angle;
}

function customMod(a: number, b: number): number {
	return a - Math.floor(a / b) * b;
}

export interface Image {
	id: string;
	sequenceId: number;
	latitude: number;
	longitude: number;
	bearing: number;
	flipped: boolean;
	pitchCorrection: number;
	visibility: boolean;
	shtHash: string | undefined;
}

interface Neighbor {
	id: string;
	pitch: number;
	yaw: number;
}

export interface TrailViewer {
	on(event: 'image-change', listener: (image: Image) => void): void;
}

export class TrailViewer {
	private _options: TrailViewerOptions = defaultTrailViewerOptions;
	private _panViewer: PannellumViewer | undefined;
	private _geo = { latitude: 0, longitude: 0 };
	private _prevNorthOffset = 0;
	private _prevYaw = 0;
	private _currImg: Image | undefined;
	private _dataArr: Image[] | undefined;
	private _dataIndex: any = {};
	private _sceneList: any[] = [];
	private _hotSpotList: any[] = [];
	private _prevImg: Image | undefined;
	private _initLat: number | undefined;
	private _initLng: number | undefined;
	private optimalDist = 4;
	private neighborDistCutoff = 10;
	private pruneAngle = 25;
	private _firstScene: any = null;
	private _map: mapboxgl.Map | undefined;
	private _mapMarker: mapboxgl.Marker | undefined;
	private _emitter: EventEmitter;
	private _sequencesData: { name: string; id: number }[] | undefined;
	private _neighbors: Neighbor[] = [];
	private _mouseOnDot = false;

	constructor(options: TrailViewerOptions = defaultTrailViewerOptions) {
		this._emitter = new EventEmitter();
		this._options = options;
		fetch(`${this._options.baseUrl}/api/sequences`, { method: 'GET' }).then(async (res) => {
			const data = await res.json();
			if (!data.success) {
				throw new Error('Failed to fetch sequence data');
			}
			this._sequencesData = data.data;
			const dataArr: Image[] = await this._fetchData();
			this._dataArr = dataArr;
			this._initViewer();
			// Create index for quick lookup of data points
			// Format: {'imageID': index, 'imageId': 8, ...}
			for (let i = 0; i < this._dataArr.length; i++) {
				this._dataIndex[this._dataArr[i]['id']] = i;
			}
			if (this._currImg) {
				this.goToImageID(this._currImg['id'], true);
			}
		});
		return this;
	}

	public on(event: string, listener: (...args: any[]) => void): void {
		this._emitter.on(event, listener);
	}

	private _createMapLayer(data: any) {
		if (this._map === undefined) {
			console.warn('Cannot create map layer as map is undefined');
			return;
		}
		if (this._map.getSource('dots')) {
			this._map.removeLayer('dots');
			this._map.removeSource('dots');
		}

		const features: FeatureCollection = {
			type: 'FeatureCollection',
			features: []
		};
		for (let i = 0; i < data.length; i++) {
			const f: Feature = {
				type: 'Feature',
				properties: {
					sequenceName: data[i]['sequence'],
					imageID: data[i]['id'],
					visible: data[i]['visibility']
				},
				geometry: {
					type: 'Point',
					coordinates: [data[i]['longitude'], data[i]['latitude']]
				}
			};
			features.features.push(f);
		}

		const layerData: mapboxgl.AnySourceData = {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: features.features
			}
		};

		this._map.addSource('dots', layerData);

		this._map.addLayer({
			id: 'dots',
			type: 'circle',
			source: 'dots',
			paint: {
				'circle-radius': 10,
				'circle-color': ['case', ['==', ['get', 'visible'], true], '#00a108', '#db8904']
			}
		});
		this._map.setPaintProperty('dots', 'circle-radius', [
			'interpolate',

			['exponential', 0.5],
			['zoom'],
			13,
			3,

			16,
			5,

			17,
			7,

			20,
			8
		]);
		this._map.setPaintProperty('dots', 'circle-opacity', [
			'interpolate',

			['exponential', 0.5],
			['zoom'],
			13,
			0.05,

			15,
			0.1,

			17,
			0.25,

			20,
			1
		]);
	}

	/**
	 * Updates navigation arrows transform
	 * Called by setInterval()
	 */
	// private _updateNavArrows() {
	//     // Arrow rotation
	//     $('.nav-arrow').each(function (index, element) {
	//         let yaw = customMod(((360 - angle180to360(instance._panViewer.getYaw())) + $(element).data('yaw')), 360);
	//         if (instance._navArrowFull) {
	//             $(element).css('transform', 'rotateZ(' + yaw + 'deg) translateY(-100px)');
	//         } else {
	//             $(element).css('transform', 'rotateZ(' + yaw + 'deg) translateY(-50px)');
	//         }
	//     });
	//     // Container rotation
	//     let rot = (instance._panViewer.getPitch() + 90) / 2.5;
	//     if (rot > 80) {
	//         rot = 80
	//     } else if (rot < 0) {
	//         rot = 0;
	//     }
	//     $('#nav_container').css('transform', 'perspective(300px) rotateX(' + rot + 'deg)');
	// }

	private _startMap(data: any) {
		// Create map
		if (!this._options.mapboxKey) {
			console.warn('No MapBox key specified');
			return;
		}
		mapboxgl.accessToken = this._options.mapboxKey;
		this._map = new mapboxgl.Map({
			container: this._options.mapTarget,
			style: 'mapbox://styles/cleveland-metroparks/cisvvmgwe00112xlk4jnmrehn?optimize=true',
			center: [-81.682665, 41.4097766],
			zoom: 9.5,
			pitchWithRotate: false,
			dragRotate: false,
			touchPitch: false,
			boxZoom: false
		});

		// Once loaded, create dots layer
		this._map.on('load', () => {
			this._createMapLayer(data);
		});

		// // Update visual cursor
		this._map.on('mouseenter', 'dots', () => {
			this._mouseOnDot = true;
			if (this._map) {
				this._map.getCanvas().style.cursor = 'pointer';
			}
		});

		this._map.on('mouseleave', 'dots', () => {
			this._mouseOnDot = false;
			if (this._map) {
				this._map.getCanvas().style.cursor = 'grab';
			}
		});

		this._map.on('mousedown', () => {
			if (this._map && !this._mouseOnDot) {
				this._map.getCanvas().style.cursor = 'grabbing';
			}
		});

		this._map.on('mouseup', () => {
			if (this._map && this._mouseOnDot) {
				this._map.getCanvas().style.cursor = 'pointer';
			} else if (this._map) {
				this._map.getCanvas().style.cursor = 'grab';
			}
		});

		// // Create currentMarker icon
		const currentMarker_wrap = document.createElement('div');
		currentMarker_wrap.classList.add('trailview-current-marker-wrapper');
		const currentMarker_div = document.createElement('div');
		currentMarker_div.classList.add('trailview-current-marker');
		const currentMarker_view_div = document.createElement('div');
		currentMarker_view_div.classList.add('trailview-marker-viewer');
		currentMarker_wrap.appendChild(currentMarker_div);
		currentMarker_wrap.appendChild(currentMarker_view_div);
		this._mapMarker = new mapboxgl.Marker(currentMarker_wrap)
			.setLngLat([-81.682665, 41.4097766])
			.addTo(this._map)
			.setRotationAlignment('map');

		this._updateMapMarkerRotation();

		this._map.jumpTo({
			center: this._mapMarker.getLngLat(),
			zoom: 16,
			bearing: 0
		});

		// // Handle when dots are clicked
		this._map.on('click', 'dots', (e) => {
			if (e.features === undefined || e.features[0].properties === null) {
				return;
			}
			this.goToImageID(e.features[0].properties.imageID);
		});
	}

	private _updateMapMarkerRotation() {
		if (this._panViewer !== undefined && this._mapMarker !== undefined) {
			const angle = this.getBearing();
			if (angle !== undefined) {
				this._mapMarker.setRotation((angle + 225) % 360);
			}
		}
		requestAnimationFrame(this._updateMapMarkerRotation.bind(this));
	}

	private _updateNavArrows(once = false) {
		const arrows = document.getElementsByClassName('trailview-nav-arrow');

		if (this._panViewer !== undefined) {
			for (const arrow of arrows) {
				const yaw = customMod(
					360 - angle180to360(this._panViewer.getYaw()) + (arrow as HTMLNavArrowElement).yaw,
					360
				);
				(
					arrow as HTMLNavArrowElement
				).style.transform = `scale(80%) translate(-50%, -50%) rotateZ(${yaw}deg) translateY(-100px)`;
			}
			// Container rotation
			let rot = (this._panViewer.getPitch() + 90) / 2.5;
			if (rot > 80) {
				rot = 80;
			} else if (rot < 0) {
				rot = 0;
			}
			(
				document.getElementById('trailview-nav-container') as HTMLDivElement
			).style.transform = `translate(-50%, 0) perspective(300px) rotateX(${rot}deg)`;
		}
		if (!once) {
			requestAnimationFrame(this._updateNavArrows.bind(this, false));
		}
	}

	setData(data: Image[]) {
		this._dataArr = data;
		// Create index for quick lookup of data points
		// Format: {'imageID': index, '27fjei9djc': 8, ...}
		for (let i = 0; i < this._dataArr.length; i++) {
			this._dataIndex[this._dataArr[i].id] = i;
		}
		if (this._panViewer !== undefined && this._currImg !== undefined) {
			// Remove all hotspots
			for (let i = 0; i < this._hotSpotList.length; i++) {
				this._panViewer.removeHotSpot(this._hotSpotList[i], this._currImg.id);
			}
			// Remove all scenes
			for (let i = 0; i < this._sceneList.length; i++) {
				this._panViewer.removeScene(this._sceneList[i]);
			}
		}
		if (this._currImg) {
			this._addSceneToViewer(this._dataArr[this._dataIndex[this._currImg.id]]);
			this.goToImageID(this._currImg.id, true);
		}
	}

	getData() {
		return this._dataArr;
	}

	getCurrentImageID(): string | undefined {
		if (this._currImg) {
			return this._currImg['id'];
		}
	}

	getFlipped(): boolean | undefined {
		if (this._currImg) {
			return this._currImg.flipped;
		} else {
			return undefined;
		}
	}

	getCurrentSequenceId(): number | undefined {
		if (this._currImg) {
			return this._currImg.sequenceId;
		} else {
			return undefined;
		}
	}

	getPanViewer(): PannellumViewer | undefined {
		return this._panViewer;
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

	private _addSceneToConfig(config: any, scene: Image): any {
		if (!this._sequencesData) {
			console.warn('Cannot add scene to config as sequence data is undefined');
			return;
		}
		const sequence = this._sequencesData.find((sequence) => {
			return sequence.id === scene.sequenceId;
		});
		if (!sequence) {
			console.warn(`Cannot add scene to config as sequence not found with id: ${scene.sequenceId}`);
			return;
		}
		config['scenes'][String(scene['id'])] = {
			horizonPitch: scene['pitchCorrection'],
			hfov: 120,
			yaw: 0,
			northOffset: scene['bearing'],
			type: 'multires',
			multiRes: {
				basePath: this._options.baseUrl + '/trails/' + sequence.name + '/img/' + scene['id'],
				path: '/%l/%s%y_%x',
				extension: 'jpg',
				tileResolution: 512,
				maxLevel: 3,
				cubeResolution: 1832
			}
		};
		return config;
	}

	private _addSceneToViewer(scene: Image, shtHash: string | null = null) {
		this._sceneList.push(scene.id);
		let horizonPitch = scene.pitchCorrection;
		let yaw = 180;
		if (!scene.flipped) {
			horizonPitch *= -1;
			yaw = 0;
		}
		let bearing = scene.bearing;
		if (!scene.flipped) {
			bearing = customMod(bearing + 180, 360);
		}
		if (!this._sequencesData) {
			console.warn('Cannot add scene to viewer as sequence data is undefined');
			return;
		}
		const sequence = this._sequencesData.find((sequence) => {
			return sequence.id === scene.sequenceId;
		});
		if (!sequence) {
			console.warn(`Cannot find sequence with id: ${scene.sequenceId}`);
			return;
		}
		const config = {
			horizonPitch: horizonPitch,
			hfov: 120,
			yaw: yaw,
			northOffset: bearing,
			type: 'multires',
			multiRes: {
				basePath: this._options.baseUrl + '/trails/' + sequence.name + '/img/' + scene['id'],
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
		if (this._panViewer !== undefined) {
			this._panViewer.addScene(scene.id, config);
		}
	}

	/**
	 * Populates navigation arrows on TrailViewer container
	 * Used as a callback on TrailView object
	 */
	private _populateArrows() {
		const navDiv = document.getElementById('trailview-nav-container') as HTMLDivElement | null;
		if (navDiv === null) {
			return;
		}
		const arrows = document.getElementsByClassName('trailview-nav-arrow');
		for (let i = arrows.length - 1; i >= 0; --i) {
			navDiv.removeChild(arrows[i]);
		}
		this._neighbors.forEach((neighbor) => {
			const arrow = document.createElement('img') as HTMLNavArrowElement;
			arrow.classList.add('trailview-nav-arrow');
			arrow.src = '/img/arrow.png';
			arrow.yaw = neighbor.yaw;
			arrow.imageId = neighbor.id;
			arrow.draggable = false;
			arrow.addEventListener('click', (event: MouseEvent) => {
				this.goToImageID((event.target as HTMLNavArrowElement).imageId);
			});
			navDiv.appendChild(arrow);
		});
	}

	/**
	 * Adds navigation arrows to viewer from neighbors array
	 * */
	private async _addNeighborsToViewer(neighbors: any[], flipped = false) {
		this._neighbors = [];
		for (let i = 0; i < neighbors.length; i++) {
			const req = await fetch(`${this._options.baseUrl}/api/preview/${neighbors[i]['id']}`, {
				method: 'GET'
			});
			const data = await req.json();

			this._addSceneToViewer(neighbors[i], data['preview']);
			// this._hotSpotList.push(neighbors[i]['id']);
			const min = this._options.navArrowMinAngle;
			const max = this._options.navArrowMaxAngle;
			const pitch = -(max - min - (neighbors[i]['distance'] * (max - min)) / 9.0) + max;
			let yaw = neighbors[i]['neighborBearing'];
			if (!flipped) {
				yaw = customMod(neighbors[i]['neighborBearing'] + 180, 360);
			}
			this._neighbors.push({
				id: neighbors[i].id,
				pitch: pitch,
				yaw: yaw
			});
		}
		this._populateArrows();
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
			console.warn('Cannot get neighbors as dataArr is undefined');
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
						sequenceId: this._dataArr[p].sequenceId,
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
		if (this._currImg === undefined) {
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
		if (this._currImg) {
			this._sceneList.push(this._currImg.id);
		}
		this._panViewer = pannellum.viewer(this._options.panoramaTarget, config);

		// Set up onSceneChange event listener
		this._panViewer.on('scenechange', (imgId: any) => {
			this._onSceneChange(imgId);
		});
		this._onSceneChange(this._panViewer.getScene());

		if (this._currImg !== undefined) {
			if (this._currImg.flipped) {
				this._panViewer.setYaw(180, false);
			} else {
				this._panViewer.setYaw(0, false);
			}
		}

		const neighbors = this._getNeighbors(this._currImg);
		if (neighbors === null) {
			console.warn('Cannot initialize as neighbors is null');
			return;
		}
		for (let i = 0; i < this._hotSpotList.length; i++) {
			this._panViewer.removeHotSpot(this._hotSpotList[i]);
		}
		if (this._currImg !== undefined) {
			this._addNeighborsToViewer(neighbors, this._currImg.flipped);
		}
		// this._emitter.emit('on-init-done');
		this._startMap(this._dataArr);

		this._initNavContainer();
	}

	private _initNavContainer() {
		const navDiv = document.createElement('div');
		navDiv.id = 'trailview-nav-container';
		document.getElementById(this._options.panoramaTarget)?.appendChild(navDiv);
		this._updateNavArrows();
	}

	/**
	 * Fetches data and then initializes viewer
	 * @private
	 */
	private async _fetchData(): Promise<Image[]> {
		if (this._options.imageFetchType == 'standard') {
			const res = await fetch(`${this._options.baseUrl}/api/images/standard`, { method: 'GET' });
			const data = await res.json();
			return new Promise((resolve) => {
				resolve(data['imagesStandard']);
			});
		} else {
			const res = await fetch(`${this._options.baseUrl}/api/images/all`, {
				method: 'GET'
			});
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
	// private _getNearestHotspot(yaw: number): any {
	// 	const config = this._panViewer.getConfig();
	// 	const hotspots = config['hotSpots'];
	// 	if (!hotspots) {
	// 		return null;
	// 	}
	// 	let nearest = hotspots[0];
	// 	let nearestDiff;
	// 	for (let i = 0; i < hotspots.length; i++) {
	// 		const diff = Math.abs(this._customMod(angle180to360(hotspots[i].yaw) - yaw + 180, 360) - 180);
	// 		nearestDiff = Math.abs(this._customMod(angle180to360(nearest.yaw) - yaw + 180, 360) - 180);
	// 		if (diff < nearestDiff) {
	// 			nearest = hotspots[i];
	// 			nearestDiff = diff;
	// 		}
	// 	}
	// 	return nearest;
	// }

	private _onSceneChange(img: string) {
		if (this._panViewer === undefined) {
			return;
		}
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

		// this._emitter.emit('on-geo-change', this._geo);

		if (this._map !== undefined && this._mapMarker !== undefined) {
			this._mapMarker.setLngLat([this._geo.longitude, this._geo.latitude]);
			this._map.easeTo({
				center: this._mapMarker.getLngLat(),
				duration: 500
			});
		}

		// Remove previous hotspots
		if (this._prevImg !== undefined) {
			for (let i = 0; i < this._hotSpotList.length; i++) {
				this._panViewer.removeHotSpot(this._hotSpotList[i], this._prevImg.id);
			}
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
		if (neighbors !== null && this._currImg !== undefined) {
			this._addNeighborsToViewer(neighbors, this._currImg.flipped);
		}
		if (this._currImg !== undefined) {
			this._emitter.emit('image-change', this._currImg);
		}
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
			console.warn('Cannot get nearest image id as dataArr is undefined');
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
		if (this._panViewer !== undefined) {
			this._panViewer.destroy();
		}
	}

	getBearing(): number | undefined {
		if (this._panViewer !== undefined) {
			return (this._panViewer.getNorthOffset() + this._panViewer.getYaw() + 180) % 360;
		} else {
			return undefined;
		}
	}

	/**
	 * Creates info in viewer
	 */
	// private _createLocalInfo(infoJson: any) {
	// 	if (this._infoJson != null) {
	// 		for (let i = 0; i < this._infoJson['ImgInfo'].length; i++) {
	// 			if (this._panViewer != null) {
	// 				this._panViewer.removeHotSpot(
	// 					this._infoJson['ImgInfo'][i]['ID'],
	// 					this._infoJson['ImgInfo'][i]['ImageID']
	// 				);
	// 			}
	// 		}
	// 	}
	// 	this._infoJson = infoJson;
	// 	for (let i = 0; i < infoJson['ImgInfo'].length; i++) {
	// 		const info = infoJson['ImgInfo'][i];
	// 		if (this._panViewer != null) {
	// 			this._panViewer.addHotSpot(
	// 				{
	// 					id: info['ID'],
	// 					pitch: info['Pitch'],
	// 					yaw: info['Yaw'],
	// 					type: 'info',
	// 					text: info['HoverText'],
	// 					clickHandlerFunc: this._onHotSpotClicked,
	// 					clickHandlerArgs: [this, info['ID']]
	// 				},
	// 				info['ImageID']
	// 			);
	// 		}
	// 	}
	// }

	/**
	 * Called when info is clicked
	 */
	private _onHotSpotClicked(evt: Event, info: any) {
		if ('onHotSpotClickFunc' in info[0]._options) {
			info[0]._options.onHotSpotClickFunc(info[1]);
		}
	}

	async goToImageID(imageID: string, reset = false) {
		if (this._panViewer === undefined) {
			return;
		}
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
