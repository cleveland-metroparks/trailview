import CheapRuler from 'cheap-ruler';
import mapboxgl from 'mapbox-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { EventEmitter } from 'events';
import urlJoin from 'url-join';
import '@cmparks/pannellum/build/pannellum.js';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@cmparks/pannellum/build/pannellum.css';
import './styles/trailviewer.css';

declare const pannellum: PannellumViewer;

// Not exhaustive
// Full API https://pannellum.org/documentation/reference/
declare class PannellumViewer {
    viewer(
        container: HTMLElement | string,
        initialConfig: object
    ): PannellumViewer;
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
    imageFetchType: 'standard' | 'all';
}

export const defaultOptions: TrailViewerOptions = {
    panoramaTarget: 'trailview_panorama',
    mapTarget: 'trailview_map',
    initialImageId: undefined,
    baseUrl: 'https://trailview.cmparks.net',
    mapboxKey: undefined,
    navArrowMinAngle: -25,
    navArrowMaxAngle: -20,
    imageFetchType: 'standard',
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function angle360to180(angle: number): number {
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

interface Neighbor extends Image {
    distance: number;
    neighborBearing: number;
}

interface NavArrowInfo {
    id: string;
    pitch: number;
    yaw: number;
}

export interface TrailViewer {
    on(event: 'image-change', listener: (image: Image) => void): void;
    on(event: 'init-done', listener: () => void): void;
}

export class TrailViewer {
    private _options: TrailViewerOptions = defaultOptions;
    private _panViewer: PannellumViewer | undefined;
    private _geo = { latitude: 0, longitude: 0 };
    private _prevNorthOffset = 0;
    private _prevYaw = 0;
    private _currImg: Image | undefined;
    private _dataArr: Image[] | undefined;
    private _dataIndex: Map<string, number> = new Map();
    private _sceneList: string[] = [];
    private _hotSpotList: string[] = [];
    private _prevImg: Image | undefined;
    private _initLat: number | undefined;
    private _initLng: number | undefined;
    private optimalDist = 4;
    private neighborDistCutoff = 10;
    private pruneAngle = 25;
    private _map: mapboxgl.Map | undefined;
    private _mapMarker: mapboxgl.Marker | undefined;
    private _emitter: EventEmitter;
    private _sequencesData: { name: string; id: number }[] | undefined;
    private _navArrowInfos: NavArrowInfo[] = [];
    private _mouseOnDot = false;

    public constructor(options: TrailViewerOptions = defaultOptions) {
        this._emitter = new EventEmitter();
        this._options = options;
        fetch(urlJoin(this._options.baseUrl, '/api/sequences'), {
            method: 'GET',
        }).then(async (res) => {
            const data = await res.json();
            if (!data.success) {
                throw new Error('Failed to fetch sequence data');
            }
            this._sequencesData = data.data;
            const dataArr: Image[] = await this._fetchData();
            this._dataArr = dataArr;
            // Create index for quick lookup of data points
            for (let i = 0; i < this._dataArr.length; i++) {
                this._dataIndex.set(this._dataArr[i].id, i);
            }
            this._initViewer(this._options.initialImageId);
            if (this._currImg) {
                this.goToImageID(this._currImg['id'], true);
            }
        });
        return this;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public on(event: string, listener: (...args: any[]) => void): void {
        this._emitter.on(event, listener);
    }

    private _createMapLayer(data: Image[]) {
        if (this._map === undefined) {
            throw new Error('Cannot create map layer as map is undefined');
        }
        if (this._map.getSource('dots')) {
            this._map.removeLayer('dots');
            this._map.removeSource('dots');
        }
        const features: FeatureCollection = {
            type: 'FeatureCollection',
            features: [],
        };
        for (let i = 0; i < data.length; i++) {
            const feature: Feature = {
                type: 'Feature',
                properties: {
                    sequenceId: data[i].sequenceId,
                    imageID: data[i].id,
                    visible: data[i].visibility,
                },
                geometry: {
                    type: 'Point',
                    coordinates: [data[i].longitude, data[i].latitude],
                },
            };
            features.features.push(feature);
        }

        const layerData: mapboxgl.AnySourceData = {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: features.features,
            },
        };

        this._map.addSource('dots', layerData);

        this._map.addLayer({
            id: 'dots',
            type: 'circle',
            source: 'dots',
            paint: {
                'circle-radius': 10,
                'circle-color': [
                    'case',
                    ['==', ['get', 'visible'], true],
                    '#00a108',
                    '#db8904',
                ],
            },
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
            8,
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
            1,
        ]);
    }

    private _startMap(data: Image[]) {
        if (!this._options.mapboxKey || !this._options.mapTarget) {
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
            boxZoom: false,
        });

        this._map.on('load', () => {
            this._createMapLayer(data);
        });

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

        this._createMapMarker();

        this._map.on('click', 'dots', (event) => {
            if (
                event.features === undefined ||
                event.features[0].properties === null
            ) {
                console.warn('Features is undefiend or properties are null');
                return;
            }
            this.goToImageID(event.features[0].properties.imageID);
        });
    }

    private _createMapMarker() {
        if (this._map === undefined) {
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
            .addTo(this._map)
            .setRotationAlignment('map');

        this._updateMapMarkerRotation();

        this._map.jumpTo({
            center: this._mapMarker.getLngLat(),
            zoom: 16,
            bearing: 0,
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
                    360 -
                        angle180to360(this._panViewer.getYaw()) +
                        (arrow as HTMLNavArrowElement).yaw,
                    360
                );
                (
                    arrow as HTMLNavArrowElement
                ).style.transform = `scale(80%) translate(-50%, -50%) rotateZ(${yaw}deg) translateY(-100px)`;
            }
            let rot = (this._panViewer.getPitch() + 90) / 2.5;
            if (rot > 80) {
                rot = 80;
            } else if (rot < 0) {
                rot = 0;
            }
            (
                document.getElementById(
                    'trailview-nav-container'
                ) as HTMLDivElement
            ).style.transform = `translate(-50%, 0) perspective(300px) rotateX(${rot}deg)`;
        }
        if (!once) {
            requestAnimationFrame(this._updateNavArrows.bind(this, false));
        }
    }

    public setData(data: Image[]) {
        this._dataArr = data;
        for (let i = 0; i < this._dataArr.length; i++) {
            this._dataIndex.set(this._dataArr[i].id, i);
        }
        if (this._panViewer !== undefined && this._currImg !== undefined) {
            for (let i = 0; i < this._hotSpotList.length; i++) {
                this._panViewer.removeHotSpot(
                    this._hotSpotList[i],
                    this._currImg.id
                );
            }
            for (let i = 0; i < this._sceneList.length; i++) {
                this._panViewer.removeScene(this._sceneList[i]);
            }
        }
        if (this._currImg) {
            const index = this._dataIndex.get(this._currImg.id);
            if (index !== undefined) {
                this._addImageToViewer(this._dataArr[index]);
                this.goToImageID(this._currImg.id, true);
            } else {
                console.warn('Cannt find image id in index');
            }
        }
    }

    public getData() {
        return this._dataArr;
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
                crossOrigin: 'use-credentials',
            },
            scenes: {},
        };
        return config;
    }

    private _addSceneToConfig(
        config: PannellumConfig,
        scene: Image
    ): PannellumConfig {
        if (!this._sequencesData) {
            throw new Error(
                'Cannot add scene to config as sequence data is undefined'
            );
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
                    '/trails',
                    `/${sequence.name}`,
                    '/img',
                    `/${scene.id}`
                ),
                path: '/%l/%s%y_%x',
                extension: 'jpg',
                tileResolution: 512,
                maxLevel: 3,
                cubeResolution: 1832,
            },
        };
        return config;
    }

    private _addImageToViewer(image: Image, shtHash?: string | undefined) {
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
            console.warn(
                'Cannot add scene to viewer as sequence data is undefined'
            );
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
                    '/trails',
                    `/${sequence.name}`,
                    '/img',
                    `/${image.id}`
                ),
                path: '/%l/%s%y_%x',
                fallbackPath: '/fallback/%s',
                extension: 'jpg',
                tileResolution: 512,
                maxLevel: 3,
                cubeResolution: 1832,
                shtHash,
            },
        };
        if (shtHash != null) {
            config.multiRes.shtHash = shtHash;
        }
        if (this._panViewer !== undefined) {
            this._panViewer.addScene(image.id, config);
        }
    }

    private _createNavArrows() {
        const navDiv = document.getElementById(
            'trailview-nav-container'
        ) as HTMLDivElement | null;
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
            arrow.addEventListener('click', (event: MouseEvent) => {
                this.goToImageID((event.target as HTMLNavArrowElement).imageId);
            });
            navDiv.appendChild(arrow);
        });
    }

    private async _addNeighborsToViewer(
        neighbors: Neighbor[],
        flipped = false
    ) {
        this._navArrowInfos = [];
        for (let i = 0; i < neighbors.length; i++) {
            const req = await fetch(
                urlJoin(
                    this._options.baseUrl,
                    '/api/preview',
                    `/${neighbors[i]['id']}`
                ),
                {
                    method: 'GET',
                }
            );
            const data = await req.json();

            this._addImageToViewer(neighbors[i], data.preview);
            const min = this._options.navArrowMinAngle;
            const max = this._options.navArrowMaxAngle;
            const pitch =
                -(max - min - (neighbors[i].distance * (max - min)) / 9.0) +
                max;
            let yaw = neighbors[i].neighborBearing;
            if (!flipped) {
                yaw = customMod(neighbors[i].neighborBearing + 180, 360);
            }
            this._navArrowInfos.push({
                id: neighbors[i].id,
                pitch: pitch,
                yaw: yaw,
            });
        }
        this._createNavArrows();
    }

    private _customMod(a: number, b: number): number {
        return a - Math.floor(a / b) * b;
    }

    private _getNeighbors(scene: Image): Neighbor[] {
        const ruler = new CheapRuler(41, 'meters');
        const neighbors: (Neighbor | undefined)[] = [];
        if (this._dataArr === undefined) {
            throw new Error('Cannot get neighbors as dataArr is undefined');
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
                const bearing = this._customMod(
                    this._customMod(brng - scene['bearing'], 360) + 180,
                    360
                );
                let skip = false;
                for (let n = 0; n < neighbors.length; n++) {
                    const neighbor = neighbors[n];
                    if (neighbor === undefined) {
                        continue;
                    }
                    const diff =
                        this._customMod(
                            neighbor.neighborBearing - bearing + 180,
                            360
                        ) - 180;
                    if (Math.abs(diff) < this.pruneAngle) {
                        if (
                            Math.abs(this.optimalDist - distance) <
                            Math.abs(this.optimalDist - neighbor.distance)
                        ) {
                            neighbors[n] = undefined;
                        } else {
                            skip = true;
                        }
                    }
                }
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
                        pitchCorrection: this._dataArr[p].pitchCorrection,
                        visibility: this._dataArr[p].visibility,
                    });
                }
            }
        }
        const filteredNeighbors = neighbors.filter((neighbor) => {
            return neighbor !== undefined;
        }) as Neighbor[];
        return filteredNeighbors;
    }

    private _initViewer(initImageId?: string) {
        if (this._dataArr === undefined) {
            console.error(
                'Cannot initialize viewer because dataArr is undefined'
            );
            return;
        }
        for (let i = 0; i < this._dataArr.length; i++) {
            this._dataIndex.set(this._dataArr[i].id, i);
        }

        if (initImageId === undefined) {
            if (this._initLat && this._initLng) {
                initImageId = this.getNearestImageId(
                    this._initLat,
                    this._initLng,
                    Number.MAX_SAFE_INTEGER
                );
            } else {
                initImageId = this._dataArr[0].id;
            }
        }

        if (initImageId === undefined) {
            throw new Error('First image not specified');
        }
        let config = this._createViewerConfig(initImageId);
        const index = this._dataIndex.get(initImageId);

        if (index !== undefined) {
            this._currImg = this._dataArr[index];
        } else {
            console.warn('Cannot find image id in index');
        }
        if (this._currImg) {
            config = this._addSceneToConfig(config, this._currImg);
            config = this._addSceneToConfig(config, this._currImg);
            this._sceneList.push(this._currImg.id);
        }
        this._panViewer = pannellum.viewer(
            this._options.panoramaTarget,
            config
        );

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
        const neighbors =
            this._currImg === undefined
                ? undefined
                : this._getNeighbors(this._currImg);
        if (neighbors === null) {
            console.warn('Cannot initialize as neighbors is null');
            return;
        }
        for (let i = 0; i < this._hotSpotList.length; i++) {
            this._panViewer.removeHotSpot(this._hotSpotList[i]);
        }
        if (this._currImg !== undefined && neighbors !== undefined) {
            this._addNeighborsToViewer(neighbors, this._currImg.flipped);
        }
        this._startMap(this._dataArr);
        this._createNavContainer();
        this._emitter.emit('init-done');
    }

    private _createNavContainer() {
        const navDiv = document.createElement('div');
        navDiv.id = 'trailview-nav-container';
        document
            .getElementById(this._options.panoramaTarget)
            ?.appendChild(navDiv);
        this._updateNavArrows();
    }

    private async _fetchData(): Promise<Image[]> {
        if (this._options.imageFetchType == 'standard') {
            const res = await fetch(
                urlJoin(this._options.baseUrl, '/api/images/standard'),
                { method: 'GET' }
            );
            const data = await res.json();
            return new Promise((resolve) => {
                resolve(data['imagesStandard']);
            });
        } else {
            const res = await fetch(
                urlJoin(this._options.baseUrl, '/api/images/all'),
                {
                    method: 'GET',
                }
            );
            const data = await res.json();
            this._dataArr = data['imagesAll'];
            return new Promise((resolve) => {
                resolve(data['imagesAll']);
            });
        }
    }

    // Returns nearest hotspot from yaw angle
    // Returns nearest hotspot config
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

    private _onImageChange(img: string | undefined) {
        if (img === undefined) {
            return;
        }
        if (this._panViewer === undefined) {
            return;
        }
        if (this._dataArr === undefined) {
            console.error('Error on scene change, dataArr is undefined');
            return;
        }
        const index = this._dataIndex.get(img);
        if (index === undefined) {
            console.error('Cannot find image in index');
            console.log(img);
            console.log(this._dataIndex);
            return;
        }
        this._currImg = this._dataArr[index];

        // Keep the same bearing on scene change
        this._prevYaw = this._panViewer.getYaw();
        const newYaw =
            (((this._prevNorthOffset - this._panViewer.getNorthOffset()) %
                360) +
                this._prevYaw) %
            360;
        this._panViewer.setYaw(newYaw, false);
        this._prevNorthOffset = this._panViewer.getNorthOffset();

        this._geo['latitude'] = this._dataArr[index]['latitude'];
        this._geo['longitude'] = this._dataArr[index]['longitude'];

        if (this._map !== undefined && this._mapMarker !== undefined) {
            this._mapMarker.setLngLat([
                this._geo.longitude,
                this._geo.latitude,
            ]);
            this._map.easeTo({
                center: this._mapMarker.getLngLat(),
                duration: 500,
            });
        }

        if (this._prevImg !== undefined) {
            for (let i = 0; i < this._hotSpotList.length; i++) {
                this._panViewer.removeHotSpot(
                    this._hotSpotList[i],
                    this._prevImg.id
                );
            }
        }
        this._hotSpotList = [];
        const hotspots = document.getElementsByClassName('pnlm-hotspot-base');
        for (let i = 0; i < hotspots.length; i++) {
            hotspots[i].remove();
        }

        const neighbors = this._getNeighbors(this._dataArr[index]);
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
        if (neighbors !== null && this._currImg !== undefined) {
            this._addNeighborsToViewer(neighbors, this._currImg.flipped);
        }
        if (this._currImg !== undefined) {
            this._emitter.emit('image-change', this._currImg);
        }
    }

    public getNearestImageId(
        lat: number,
        lng: number,
        distCutoff = 10
    ): string | undefined {
        const ruler = new CheapRuler(41, 'meters');
        let minDist = Number.MAX_SAFE_INTEGER;
        let minId: string | undefined;
        if (this._dataArr === undefined) {
            console.warn('Cannot get nearest image id as dataArr is undefined');
            return undefined;
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

    public getImageGeo(): { latitude: number; longitude: number } {
        return this._geo;
    }

    public destroy() {
        if (this._panViewer !== undefined) {
            this._panViewer.destroy();
        }
    }

    public getBearing(): number | undefined {
        if (this._panViewer !== undefined) {
            return (
                (this._panViewer.getNorthOffset() +
                    this._panViewer.getYaw() +
                    180) %
                360
            );
        } else {
            return undefined;
        }
    }

    // Creates info in viewer
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

    // Called when info is clicked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _onHotSpotClicked(evt: Event, info: any) {
        if ('onHotSpotClickFunc' in info[0]._options) {
            info[0]._options.onHotSpotClickFunc(info[1]);
        }
    }

    public async goToImageID(imageID: string, reset = false) {
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
            const res = await fetch(
                urlJoin(this._options.baseUrl, '/api/preview', `/${imageID}`),
                { method: 'GET' }
            );
            const data = await res.json();

            if (this._dataArr !== undefined) {
                const index = this._dataIndex.get(imageID);
                if (index !== undefined) {
                    this._addImageToViewer(
                        this._dataArr[index],
                        data['preview']
                    );
                } else {
                    console.warn('Cannot find image id in index');
                }
            }
            this._panViewer.loadScene(imageID, 'same', 'same', 'same');
        } else {
            this._panViewer.loadScene(imageID, 'same', 'same', 'same');
        }
        return this;
    }
}
