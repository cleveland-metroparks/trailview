import '@cmparks/pannellum/build/pannellum.js';
import '@cmparks/pannellum/build/pannellum.css';
import './styles/trailviewer-base.css';
declare class PannellumViewer {
    viewer(container: HTMLElement | string, initialConfig: object): PannellumViewer;
    resize(): void;
    getYaw(): number;
    getPitch(): number;
    removeHotSpot(hotSpotId: string, sceneId?: string): boolean;
    removeScene(sceneId: string): boolean;
    addScene(sceneId: string, config: object): PannellumViewer;
    addHotSpot(hs: object, sceneId?: string): PannellumViewer;
    on(type: string, listener: Function): PannellumViewer;
    getScene(): string;
    setYaw(yaw: number, animated: boolean | number, callback?: Function, callbackArgs?: object): PannellumViewer;
    getNorthOffset(): number;
    destroy(): void;
    loadScene(sceneId: string, pitch?: number | 'same', yaw?: number | 'same', hfov?: number | 'same'): void;
    lookAt(pitch?: number, yaw?: number, hfov?: number, animated?: boolean | number, callback?: Function, callbackArgs?: object): PannellumViewer;
}
export interface TrailViewerBaseOptions {
    target: string;
    initial: string | {
        latitude: number;
        longitude: number;
    };
    baseUrl: string;
    navArrowMinAngle: number;
    navArrowMaxAngle: number;
    imageFetchType: 'standard' | 'all';
    filterSequences: number[] | undefined;
}
export declare const defaultBaseOptions: TrailViewerBaseOptions;
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
export interface TrailViewerBaseEvents {
    on(event: 'image-change', listener: (image: Image) => void): void;
    on(event: 'init-done', listener: () => void): void;
}
export declare class TrailViewerBase implements TrailViewerBaseEvents {
    protected _options: TrailViewerBaseOptions;
    private _panViewer;
    private _geo;
    private _prevNorthOffset;
    private _prevYaw;
    private _currImg;
    private _sceneList;
    private _hotSpotList;
    private _prevImg;
    private _emitter;
    private _sequencesData;
    private _navArrowInfos;
    protected _destroyed: boolean;
    private _neighbors;
    private _pitchCorrectionOverride;
    constructor(options?: TrailViewerBaseOptions);
    on(event: string, listener: (...args: any[]) => void): void;
    overridePitchCorrection(pitch?: number): void;
    private _updateNavArrows;
    getCurrentImageID(): string | undefined;
    getFlipped(): boolean | undefined;
    getCurrentSequenceId(): number | undefined;
    getPanViewer(): PannellumViewer | undefined;
    private _createViewerConfig;
    private _addSceneToConfig;
    private _addImageToViewer;
    resize(): void;
    private _createNavArrows;
    private _addNeighborsToViewer;
    private _customMod;
    private _getNeighbors;
    private _initViewer;
    private _createNavContainer;
    private _onImageChange;
    getImageGeo(): {
        latitude: number;
        longitude: number;
    };
    destroy(): void;
    getBearing(): number | undefined;
    goToImageID(imageId: string, reset?: boolean): Promise<this | undefined>;
}
export {};
