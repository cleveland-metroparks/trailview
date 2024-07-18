import mapboxgl from 'mapbox-gl';
import { EventEmitter } from 'events';
import urlJoin from 'url-join';
import '@cmparks/pannellum/build/pannellum.js';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@cmparks/pannellum/build/pannellum.css';
import type { PatchRequestType } from '../routes/admin/edit/+server';

declare const pannellum: PannellumViewer;

// Not exhaustive
// Full API https://pannellum.org/documentation/reference/
declare class PannellumViewer {
	viewer(container: HTMLElement | string, initialConfig: object): PannellumViewer;
	getYaw(): number;
	getPitch(): number;
	removeHotSpot(hotSpotId: string, sceneId?: string): boolean;
	removeScene(sceneId: string): boolean;
	addScene(sceneId: string, config: object): PannellumViewer;
	addHotSpot(hs: object, sceneId?: string): PannellumViewer;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	on(type: string, listener: Function): PannellumViewer;
	getScene(): string;
	setYaw(
		yaw: number,
		animated: boolean | number,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
		callback?: Function,
		callbackArgs?: object
	): PannellumViewer;
}

// Not exhaustive
// Full API https://pannellum.org/documentation/reference/
interface PannellumSceneConfig {
	horizonPitch?: number;
	hfov?: number;
	yaw?: number;
	northOffset?: number;
	type?: string;
	multiRes?: {
		basePath: string;
		path: string;
		extension: string;
		tileResolution: number;
		maxLevel: number;
		cubeResolution: number;
	};
	sceneFadeDuration?: number;
}

// Not exhaustive
// Full API https://pannellum.org/documentation/reference/
interface PannellumDefaultSceneConfig extends PannellumSceneConfig {
	firstScene: string;
}

// Not exhaustive
// Full API https://pannellum.org/documentation/reference/
interface PannellumConfig {
	default: PannellumDefaultSceneConfig;
	scenes: { [sceneId: string]: PannellumSceneConfig };
}

export interface TrailViewerOptions {
	panoramaTarget: string;
	mapTarget: string | undefined;
	initialImageId: string | undefined;
	baseUrl: string;
	mapboxKey: string | undefined;
	navArrowMinAngle: number;
	navArrowMaxAngle: number;
	fetchPrivate: boolean;
}

export const defaultOptions: TrailViewerOptions = {
	panoramaTarget: 'trailview_panorama',
	mapTarget: 'trailview_map',
	initialImageId: undefined,
	baseUrl: 'https://trailview.cmparks.net',
	mapboxKey: undefined,
	navArrowMinAngle: -25,
	navArrowMaxAngle: -20,
	fetchPrivate: false
};

interface HTMLNavArrowElement extends HTMLImageElement {
	yaw: number;
	imageId: string;
}

function angle180to360(angle: number): number {
	if (angle < 0) {
		angle = 360 + angle;
	}
	return angle;
}

function customMod(a: number, b: number): number {
	return a - Math.floor(a / b) * b;
}

export type Image = {
	id: string;
	sequenceId: number;
	coordinates: [number, number];
	bearing: number;
	flipped: boolean;
	pitchCorrection: number;
	public: boolean;
	createdAt: Date;
	shtHash: string | undefined;
};

export interface Neighbor extends Image {
	distance: number;
	neighborBearing: number;
}

interface NavArrowInfo {
	id: string;
	pitch: number;
	yaw: number;
}

type ImageData = {
	id: string;
	pitchCorrection: number;
	bearing: number;
	coordinates: [number, number];
	flipped: boolean;
	public: boolean;
	sequenceId: number;
};

export interface TrailViewerEvents {
	on(event: 'image-change', listener: (image: Image) => void): void;
	on(event: 'init-done', listener: () => void): void;
	on(event: 'edit', listener: () => void): void;
	on(event: 'map-move-end', listener: (bounds: mapboxgl.LngLatBounds) => void): void;
	on(event: 'map-load', listener: () => void): void;
	on(event: 'edit-change', listener: (enabled: boolean) => void): void;
}

export class TrailViewer implements TrailViewerEvents {
	private _options: TrailViewerOptions = defaultOptions;
	private _panViewer: PannellumViewer | undefined;
	private _geo = { latitude: 0, longitude: 0 };
	private _prevNorthOffset = 0;
	private _prevYaw = 0;
	private _currImg: Image | undefined;
	private _sceneList: string[] = [];
	private _hotSpotList: string[] = [];
	private _prevImg: Image | undefined;
	public map: mapboxgl.Map | undefined;
	private _mapMarker: mapboxgl.Marker | undefined;
	private _emitter: EventEmitter;
	private _sequencesData: { name: string; id: number }[] | undefined;
	private _navArrowInfos: NavArrowInfo[] = [];
	private _mouseOnDot = false;
	private _destroyed = false;
	private _neighbors: Neighbor[] = [];
	private _pitchCorrectionOverride: number | undefined;
	private _editMarkers: mapboxgl.Marker[] = [];
	public editList: {
		imageId: string;
		new: { latitude: number; longitude: number };
	}[] = [];
	private _editOnZoom: boolean = false;

	public allImageData: ImageData[] | undefined;

	public constructor(options: TrailViewerOptions = defaultOptions) {
		this._emitter = new EventEmitter();
		this._options = options;
		fetch(urlJoin(this._options.baseUrl, '/api/sequences'), {
			method: 'GET'
		}).then(async (sequencesRes) => {
			const data = await sequencesRes.json();
			this.fetchAllImageData().then(async () => {
				if (data.success !== true) {
					throw new Error('Failed to fetch sequence data');
				}
				this._sequencesData = data.data;
				await this._initViewer(this._options.initialImageId);
				if (this._currImg) {
					this.goToImageID(this._currImg.id, true);
				}
			});
		});
		return this;
	}

	async fetchAllImageData() {
		const res = await fetch('/api/images/private', { method: 'GET' });
		const imagesData = await res.json();
		if (imagesData.success !== true) {
			throw new Error('Unable to fetch all image data');
		}
		this.allImageData = imagesData.data;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public on(event: string, listener: (...args: any[]) => void): void {
		this._emitter.on(event, listener);
	}

	public overridePitchCorrection(pitch?: number) {
		this._pitchCorrectionOverride = pitch;
		if (this._currImg !== undefined) {
			this.goToImageID(this._currImg.id, true);
		}
	}

	private _createMapLayer() {
		if (this.map === undefined) {
			throw new Error('Cannot create map layer as map is undefined');
		}
		if (this.map.getSource('dots') !== undefined) {
			this.map.removeLayer('dots');
			this.map.removeSource('dots');
		}
		const layerData: mapboxgl.AnySourceData = {
			type: 'vector',
			format: 'pbf',
			tiles: [
				urlJoin(
					this._options.baseUrl,
					`/api/tiles/{z}/{x}/{y}`,
					this._options.fetchPrivate ? 'private' : ''
				)
			]
		};

		this.map.addSource('dots', layerData);

		this.map.addLayer({
			id: 'dots',
			'source-layer': 'geojsonLayer',
			source: 'dots',
			type: 'circle',
			paint: {
				'circle-radius': 10,
				'circle-color': ['case', ['==', ['get', 'public'], true], '#00a108', '#db8904']
			}
		});
		this.map.setPaintProperty('dots', 'circle-radius', [
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
		this.map.setPaintProperty('dots', 'circle-opacity', [
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
		if (this._editOnZoom === true) {
			this.map.setLayerZoomRange('dots', 0, 17);
		}
	}

	private _startMap() {
		if (this._options.mapboxKey === undefined || this._options.mapTarget === undefined) {
			return;
		}
		mapboxgl.accessToken = this._options.mapboxKey;
		this.map = new mapboxgl.Map({
			container: this._options.mapTarget,
			style: 'mapbox://styles/cleveland-metroparks/cisvvmgwe00112xlk4jnmrehn?optimize=true',
			center: [-81.682665, 41.4097766],
			zoom: 9.5,
			pitchWithRotate: false,
			dragRotate: false,
			touchPitch: false,
			boxZoom: false
		});

		this.map.on('load', () => {
			this._createMapLayer();
			this._emitter.emit('map-load');
		});

		this.map.on('moveend', () => {
			this._updateEditMarkers();
			if (this.map !== undefined) {
				this._emitter.emit('map-move-end', this.map.getBounds());
			}
		});

		this.map.on('mouseenter', 'dots', () => {
			this._mouseOnDot = true;
			if (this.map) {
				this.map.getCanvas().style.cursor = 'pointer';
			}
		});

		this.map.on('mouseleave', 'dots', () => {
			this._mouseOnDot = false;
			if (this.map) {
				this.map.getCanvas().style.cursor = 'grab';
			}
		});

		this.map.on('mousedown', () => {
			if (this.map && !this._mouseOnDot) {
				this.map.getCanvas().style.cursor = 'grabbing';
			}
		});

		this.map.on('mouseup', () => {
			if (this.map && this._mouseOnDot) {
				this.map.getCanvas().style.cursor = 'pointer';
			} else if (this.map) {
				this.map.getCanvas().style.cursor = 'grab';
			}
		});

		this._createMapMarker();

		this.map.on('click', 'dots', (event) => {
			if (event.features === undefined || event.features[0].properties === null) {
				console.warn('Features is undefined or properties are null');
				return;
			}
			this.goToImageID(event.features[0].properties.imageID);
		});
	}

	public centerMarker() {
		if (this.map !== undefined && this._mapMarker !== undefined) {
			this.map.easeTo({ center: this._mapMarker.getLngLat() });
		}
	}

	public setEditOnZoom(enabled: boolean) {
		if (this.map === undefined) {
			this._editOnZoom = enabled;
			return;
		}
		if (enabled === true) {
			this.map.setLayerZoomRange('dots', 0, 17);
			this._updateEditMarkers();
			this.map.zoomTo(17);
		} else {
			this.map.setLayerZoomRange('dots', 0, 22);
			this._updateEditMarkers();
			this.map.zoomTo(17);
		}
		this._editOnZoom = enabled;
	}

	public _updateEditMarkers() {
		if (this.map === undefined || this.allImageData === undefined) {
			return;
		}
		for (const marker of this._editMarkers) {
			marker.remove();
		}
		if (this._editOnZoom === true && this.map.getZoom() >= 17) {
			this._emitter.emit('edit-change', true);
			const bounds = this.map.getBounds();
			if (bounds === null) {
				return;
			}
			for (const image of this.allImageData) {
				if (!bounds.contains(image.coordinates)) {
					if (
						this.editList.find((e) => {
							return e.imageId === image.id && bounds.contains([e.new.longitude, e.new.latitude]);
						}) === undefined
					) {
						continue;
					}
				}
				const element = document.createElement('div');
				element.classList.add('trailview-draggable');
				if (image.public === false) {
					element.classList.add('trailview-draggable-private');
				}
				element.addEventListener('click', () => {
					this.goToImageID(image.id);
				});
				let markerLoc: [number, number] = image.coordinates;
				const lastEdit = this.editList.findLast((e) => {
					return e.imageId === image.id;
				});
				if (lastEdit !== undefined) {
					markerLoc = [lastEdit.new.longitude, lastEdit.new.latitude];
				}
				const marker = new mapboxgl.Marker({
					element,
					draggable: true
				})
					.setLngLat(markerLoc)
					.addTo(this.map);
				marker.on('dragend', () => {
					const loc = marker.getLngLat();
					this.editList.push({
						imageId: image.id,
						new: { latitude: loc.lat, longitude: loc.lng }
					});
					this._emitter.emit('edit');
				});
				this._editMarkers.push(marker);
			}
		} else {
			this._emitter.emit('edit-change', false);
		}
	}

	public pushEdit(imageId: string, latitude: number, longitude: number): void {
		this.editList.push({ imageId: imageId, new: { latitude, longitude } });
		this._emitter.emit('edit');
	}

	private _createMapMarker() {
		if (this.map === undefined) {
			throw new Error('Cannot create map marker as map is undefined');
		}
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
			.addTo(this.map)
			.setRotationAlignment('map');

		this._updateMapMarkerRotation();

		this.map.jumpTo({
			center: this._mapMarker.getLngLat(),
			zoom: 16,
			bearing: 0
		});
	}

	private _updateMapMarkerRotation() {
		if (this._panViewer !== undefined && this._mapMarker !== undefined) {
			const angle = this.getBearing();
			if (angle !== undefined) {
				this._mapMarker.setRotation((angle + 225) % 360);
			}
		}
		if (this._destroyed === false) {
			requestAnimationFrame(this._updateMapMarkerRotation.bind(this));
		}
	}

	private _updateNavArrows(once = false) {
		const arrows = document.getElementsByClassName('trailview-nav-arrow');

		if (this._panViewer !== undefined) {
			for (const arrow of arrows) {
				const yaw = customMod(
					360 - angle180to360(this._panViewer.getYaw()) + (arrow as HTMLNavArrowElement).yaw,
					360
				);
				(arrow as HTMLNavArrowElement).style.transform =
					`scale(80%) translate(-50%, -50%) rotateZ(${yaw}deg) translateY(-100px)`;
			}
			let rot = (this._panViewer.getPitch() + 90) / 2.5;
			if (rot > 80) {
				rot = 80;
			} else if (rot < 0) {
				rot = 0;
			}
			(document.getElementById('trailview-nav-container') as HTMLDivElement).style.transform =
				`translate(-50%, 0) perspective(300px) rotateX(${rot}deg)`;
		}
		if (!once && this._destroyed === false) {
			requestAnimationFrame(this._updateNavArrows.bind(this, false));
		}
	}

	public getCurrentImageID(): string | undefined {
		if (this._currImg) {
			return this._currImg['id'];
		}
	}

	public getFlipped(): boolean | undefined {
		if (this._currImg) {
			return this._currImg.flipped;
		} else {
			return undefined;
		}
	}

	public getCurrentSequenceId(): number | undefined {
		if (this._currImg) {
			return this._currImg.sequenceId;
		} else {
			return undefined;
		}
	}

	public getPanViewer(): PannellumViewer | undefined {
		return this._panViewer;
	}

	private _createViewerConfig(firstScene: string): PannellumConfig {
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

	private _addSceneToConfig(config: PannellumConfig, scene: Image): PannellumConfig {
		if (!this._sequencesData) {
			throw new Error('Cannot add scene to config as sequence data is undefined');
		}
		const sequence = this._sequencesData.find((sequence) => {
			return sequence.id === scene.sequenceId;
		});
		if (!sequence) {
			throw new Error(
				`Cannot add scene to config as sequence not found with id: ${scene.sequenceId}`
			);
		}
		config['scenes'][String(scene['id'])] = {
			horizonPitch: scene['pitchCorrection'],
			hfov: 120,
			yaw: 0,
			northOffset: scene['bearing'],
			type: 'multires',
			multiRes: {
				basePath: urlJoin(
					this._options.baseUrl,
					'/api/pan-image',
					`/${scene.id}`,
					this._options.fetchPrivate ? 'private' : ''
				),
				path: '/%l/%s%y_%x',
				extension: 'jpg',
				tileResolution: 512,
				maxLevel: 3,
				cubeResolution: 1832
			}
		};
		return config;
	}

	private _addImageToViewer(image: Image, shtHash?: string) {
		this._sceneList.push(image.id);
		let horizonPitch = image.pitchCorrection;
		let yaw = 180;
		if (!image.flipped) {
			horizonPitch *= -1;
			yaw = 0;
		}
		let bearing = image.bearing;
		if (!image.flipped) {
			bearing = customMod(bearing + 180, 360);
		}
		if (!this._sequencesData) {
			console.warn('Cannot add scene to viewer as sequence data is undefined');
			return;
		}
		const sequence = this._sequencesData.find((sequence) => {
			return sequence.id === image.sequenceId;
		});
		if (!sequence) {
			console.warn(`Cannot find sequence with id: ${image.sequenceId}`);
			return;
		}
		const config = {
			horizonPitch: horizonPitch,
			hfov: 120,
			yaw: yaw,
			northOffset: bearing,
			type: 'multires',
			multiRes: {
				basePath: urlJoin(
					this._options.baseUrl,
					'/api/pan-image',
					`/${image.id}`,
					this._options.fetchPrivate ? 'private' : ''
				),
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
			this._panViewer.addScene(image.id, config);
		}
	}

	private _createNavArrows() {
		const navDiv = document.getElementById('trailview-nav-container') as HTMLDivElement | null;
		if (navDiv === null) {
			return;
		}
		const arrows = document.getElementsByClassName('trailview-nav-arrow');
		for (let i = arrows.length - 1; i >= 0; --i) {
			navDiv.removeChild(arrows[i]);
		}
		this._navArrowInfos.forEach((info) => {
			const arrow = document.createElement('img') as HTMLNavArrowElement;
			arrow.classList.add('trailview-nav-arrow');
			arrow.src = urlJoin(this._options.baseUrl, '/assets/img/arrow.png');
			arrow.yaw = info.yaw;
			arrow.imageId = info.id;
			arrow.draggable = false;
			arrow.alt = 'Navigation arrow';
			arrow.addEventListener('click', (event: MouseEvent) => {
				this.goToImageID((event.target as HTMLNavArrowElement).imageId);
			});
			navDiv.appendChild(arrow);
		});
	}

	private async _addNeighborsToViewer(neighbors: Neighbor[], flipped = false) {
		this._navArrowInfos = [];
		for (let i = 0; i < neighbors.length; i++) {
			if (this._pitchCorrectionOverride !== undefined) {
				neighbors[i].pitchCorrection = this._pitchCorrectionOverride;
			}
			this._addImageToViewer(neighbors[i], neighbors[i].shtHash);
			const min = this._options.navArrowMinAngle;
			const max = this._options.navArrowMaxAngle;
			const pitch = -(max - min - (neighbors[i].distance * (max - min)) / 9.0) + max;
			let yaw = neighbors[i].neighborBearing;
			if (!flipped) {
				yaw = customMod(neighbors[i].neighborBearing + 180, 360);
			}
			this._navArrowInfos.push({
				id: neighbors[i].id,
				pitch: pitch,
				yaw: yaw
			});
		}
		this._createNavArrows();
	}

	private async _getNeighbors(image: Image): Promise<Neighbor[]> {
		const res = await fetch(
			urlJoin(
				this._options.baseUrl,
				'/api/neighbors',
				image.id,
				this._options.fetchPrivate ? 'private' : ''
			)
		);
		const data = await res.json();
		if (data.success !== true) {
			throw new Error('Failed to fetch neighbors');
		}
		return data.data;
	}

	private async _initViewer(initImageId?: string) {
		if (initImageId === undefined) {
			throw new Error('No initial image specified');
		}
		let config = this._createViewerConfig(initImageId);
		const res = await fetch(
			urlJoin(
				this._options.baseUrl,
				'/api/images',
				initImageId,
				this._options.fetchPrivate ? 'private' : ''
			)
		);
		const data = await res.json();
		if (data.success !== true) {
			throw new Error('Unable to fetch initial image');
		}
		this._currImg = data.data as Image;
		if (this._currImg !== undefined) {
			config = this._addSceneToConfig(config, this._currImg);
			config = this._addSceneToConfig(config, this._currImg);
			this._sceneList.push(this._currImg.id);
		}
		this._panViewer = pannellum.viewer(this._options.panoramaTarget, config);

		this._panViewer.on('scenechange', (imgId: string) => {
			this._onImageChange(imgId);
		});
		this._onImageChange(this._panViewer.getScene());

		if (this._currImg !== undefined) {
			if (this._currImg.flipped) {
				this._panViewer.setYaw(180, false);
			} else {
				this._panViewer.setYaw(0, false);
			}
		}
		this._neighbors = await this._getNeighbors(this._currImg);
		for (let i = 0; i < this._hotSpotList.length; i++) {
			this._panViewer.removeHotSpot(this._hotSpotList[i]);
		}
		if (this._currImg !== undefined) {
			this._addNeighborsToViewer(this._neighbors, this._currImg.flipped);
		}
		this._startMap();
		this._createNavContainer();

		this._emitter.emit('init-done');
	}

	private _createNavContainer() {
		const navDiv = document.createElement('div');
		navDiv.id = 'trailview-nav-container';
		document.getElementById(this._options.panoramaTarget)?.appendChild(navDiv);
		this._updateNavArrows();
	}

	private async _fetchData(): Promise<Image[]> {
		if (this._options.fetchPrivate === false) {
			const res = await fetch(urlJoin(this._options.baseUrl, '/api/images'), {
				method: 'GET'
			});
			const data = await res.json();
			if (data.success === true) {
				return data.data;
			} else {
				throw new Error('Fetching image data unsuccessful');
			}
		} else {
			const res = await fetch(urlJoin(this._options.baseUrl, '/api/images/private'), {
				method: 'GET'
			});
			const data = await res.json();
			if (data.success === true) {
				return data.data;
			} else {
				throw new Error('Fetching image data unsuccessful');
			}
		}
	}

	private async _onImageChange(img: string | undefined) {
		if (img === undefined) {
			return;
		}
		if (this._panViewer === undefined) {
			return;
		}

		// Keep the same bearing on scene change
		this._prevYaw = this._panViewer.getYaw();
		const newYaw =
			(((this._prevNorthOffset - this._panViewer.getNorthOffset()) % 360) + this._prevYaw) % 360;
		this._panViewer.setYaw(newYaw, false);
		this._prevNorthOffset = this._panViewer.getNorthOffset();

		if (this._currImg === undefined) {
			throw new Error('Current image is undefined');
		}

		this._geo.latitude = this._currImg.coordinates[1];
		this._geo.longitude = this._currImg.coordinates[0];

		if (this.map !== undefined && this._mapMarker !== undefined) {
			let markerLoc: [number, number] = [this._geo.longitude, this._geo.latitude];
			const lastEdit = this.editList.findLast((e) => {
				return e.imageId === img;
			});
			if (lastEdit !== undefined) {
				markerLoc = [lastEdit.new.longitude, lastEdit.new.latitude];
			}
			this._mapMarker.setLngLat(markerLoc);
			this.map.easeTo({
				center: this._mapMarker.getLngLat(),
				duration: 500
			});
		}
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
		this._neighbors = await this._getNeighbors(this._currImg);
		const visibleScenes = [img];
		for (let i = 0; i < this._neighbors.length; i++) {
			visibleScenes.push(this._neighbors[i].id);
		}
		for (let i = 0; i < this._sceneList.length; i++) {
			if (!visibleScenes.includes(this._sceneList[i])) {
				this._panViewer.removeScene(this._sceneList[i]);
			}
		}
		this._sceneList = visibleScenes;
		this._prevImg = this._currImg;
		this._addNeighborsToViewer(this._neighbors, this._currImg.flipped);
		this._emitter.emit('image-change', this._currImg);
	}

	public undoEdit() {
		if (this.map !== undefined && this.map.getZoom() > 17) {
			if (this.editList.length !== 0) {
				this.editList.pop();
			}
			this._updateEditMarkers();
		}
		this._emitter.emit('edit');
	}

	public discardEdits() {
		if (this.map === undefined) {
			return;
		}
		this.editList = [];
		this._updateEditMarkers();
		this._emitter.emit('edit');
	}

	public async submitEdits() {
		if (this.editList.length === 0) {
			return;
		}
		const latestEdits = new Map<string, { latitude: number; longitude: number }>();
		for (let i = this.editList.length - 1; i >= 0; --i) {
			if (latestEdits.has(this.editList[i].imageId)) {
				continue;
			}
			latestEdits.set(this.editList[i].imageId, this.editList[i].new);
		}
		const patchData: PatchRequestType = { data: [] };
		Array.from(latestEdits.entries()).forEach((edit) => {
			patchData.data.push({
				imageId: edit[0],
				new: { latitude: edit[1].latitude, longitude: edit[1].longitude }
			});
		});
		await fetch(urlJoin(this._options.baseUrl, '/admin/edit'), {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patchData)
		});
		this.editList = [];
	}

	public getImageGeo(): { latitude: number; longitude: number } {
		return this._geo;
	}

	public destroy() {
		this._destroyed = true;
		if (this._panViewer !== undefined) {
			this._panViewer.destroy();
		}
		if (this.map !== undefined) {
			this.map.remove();
			this.map = undefined;
		}
	}

	public getBearing(): number | undefined {
		if (this._panViewer !== undefined) {
			return (this._panViewer.getNorthOffset() + this._panViewer.getYaw() + 180) % 360;
		} else {
			return undefined;
		}
	}

	public async goToImageID(imageId: string, reset = false) {
		if (this._panViewer === undefined) {
			return;
		}

		let image = this._neighbors.find((neighbor) => {
			return neighbor.id === imageId;
		}) as Image | undefined;
		if (reset) {
			for (let i = 0; i < this._sceneList.length; i++) {
				this._panViewer.removeScene(this._sceneList[i]);
			}
			this._sceneList = [];
			this._neighbors = [];
		}
		if (image === undefined) {
			const res = await fetch(
				urlJoin(
					this._options.baseUrl,
					'/api/images',
					imageId,
					this._options.fetchPrivate ? 'private' : ''
				)
			);
			const data = await res.json();
			if (data.success !== true) {
				throw new Error('Unable to fetch image data');
			}
			image = data.data as Image;
			if (this._pitchCorrectionOverride !== undefined) {
				image.pitchCorrection = this._pitchCorrectionOverride;
			}
			this._addImageToViewer(image, data.preview);
		}
		this._currImg = image;
		this._panViewer.loadScene(image.id, 'same', 'same', 'same');

		return this;
	}
}
