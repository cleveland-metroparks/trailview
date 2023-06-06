import { EventEmitter } from 'events';
import urlJoin from 'url-join';
import '@cmparks/pannellum/build/pannellum.js';
import '@cmparks/pannellum/build/pannellum.css';
import './styles/trailviewer-base.css';

declare const pannellum: PannellumViewer;

// Not exhaustive
// Full API https://pannellum.org/documentation/reference/
declare class PannellumViewer {
    viewer(
        container: HTMLElement | string,
        initialConfig: object
    ): PannellumViewer;
    resize(): void;
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

export interface TrailViewerBaseOptions {
    target: string;
    initialImageId: string;
    baseUrl: string;
    navArrowMinAngle: number;
    navArrowMaxAngle: number;
    imageFetchType: 'standard' | 'all';
}

export const defaultBaseOptions: TrailViewerBaseOptions = {
    target: 'trailview_panorama',
    initialImageId: 'c96ba6029cad464e9a4b7f9a6b8ac0d5',
    baseUrl: 'https://trailview.cmparks.net',
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

export interface Neighbor extends Image {
    distance: number;
    neighborBearing: number;
}

interface NavArrowInfo {
    id: string;
    pitch: number;
    yaw: number;
}

export interface TrailViewerBase {
    on(event: 'image-change', listener: (image: Image) => void): void;
    on(event: 'init-done', listener: () => void): void;
}

export class TrailViewerBase {
    private _options: TrailViewerBaseOptions = defaultBaseOptions;
    private _panViewer: PannellumViewer | undefined;
    private _geo = { latitude: 0, longitude: 0 };
    private _prevNorthOffset = 0;
    private _prevYaw = 0;
    private _currImg: Image | undefined;
    private _sceneList: string[] = [];
    private _hotSpotList: string[] = [];
    private _prevImg: Image | undefined;
    private _emitter: EventEmitter;
    private _sequencesData: { name: string; id: number }[] | undefined;
    private _navArrowInfos: NavArrowInfo[] = [];
    private _mouseOnDot = false;
    private _destroyed = false;
    private _neighbors: Neighbor[] = [];
    private _pitchCorrectionOverride: number | undefined;

    public constructor(options: TrailViewerBaseOptions = defaultBaseOptions) {
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
            await this._initViewer(this._options.initialImageId);
            if (this._currImg) {
                this.goToImageID(this._currImg.id, true);
            }
        });
        return this;
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
                    '/api/panImage',
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
                    '/api/panImage',
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

    public resize() {
        this._panViewer?.resize();
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
            arrow.alt = 'Navigation arrow';
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
            if (this._pitchCorrectionOverride !== undefined) {
                neighbors[i].pitchCorrection = this._pitchCorrectionOverride;
            }
            this._addImageToViewer(neighbors[i], neighbors[i].shtHash);
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

    private async _getNeighbors(image: Image): Promise<Neighbor[]> {
        const res = await fetch(
            urlJoin(
                this._options.baseUrl,
                '/api/neighbors',
                this._options.imageFetchType,
                image.id
            )
        );
        const data = await res.json();
        if (data.success !== true) {
            throw new Error('Failed to retrieve neighbors');
        }
        return data.data;
    }

    private async _initViewer(initImageId: string) {
        let config = this._createViewerConfig(initImageId);
        const res = await fetch(
            urlJoin(
                this._options.baseUrl,
                '/api/images',
                this._options.imageFetchType,
                initImageId
            )
        );
        const data = await res.json();
        if (data.success !== true) {
            throw new Error('Unable to fetch initial image');
        }
        this._currImg = data.data as Image;
        if (this._currImg) {
            config = this._addSceneToConfig(config, this._currImg);
            config = this._addSceneToConfig(config, this._currImg);
            this._sceneList.push(this._currImg.id);
        }
        this._panViewer = pannellum.viewer(this._options.target, config);

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
        this._createNavContainer();
        this._emitter.emit('init-done');
    }

    private _createNavContainer() {
        const navDiv = document.createElement('div');
        navDiv.id = 'trailview-nav-container';
        document.getElementById(this._options.target)?.appendChild(navDiv);
        this._updateNavArrows();
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
            (((this._prevNorthOffset - this._panViewer.getNorthOffset()) %
                360) +
                this._prevYaw) %
            360;
        this._panViewer.setYaw(newYaw, false);
        this._prevNorthOffset = this._panViewer.getNorthOffset();

        if (this._currImg === undefined) {
            throw new Error('Current image is undefined');
        }

        this._geo.latitude = this._currImg.latitude;
        this._geo.longitude = this._currImg.longitude;

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

    public getImageGeo(): { latitude: number; longitude: number } {
        return this._geo;
    }

    public destroy() {
        this._destroyed = true;
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
                    this._options.imageFetchType,
                    imageId
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
