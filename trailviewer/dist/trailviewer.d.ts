import '@cmparks/pannellum/build/pannellum.js';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@cmparks/pannellum/build/pannellum.css';
import './styles/trailviewer.css';
declare class PannellumViewer {
    viewer(container: HTMLElement | string, initialConfig: object): PannellumViewer;
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
export declare const defaultOptions: TrailViewerOptions;
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
export interface TrailViewer {
    on(event: 'image-change', listener: (image: Image) => void): void;
    on(event: 'init-done', listener: () => void): void;
}
export declare class TrailViewer {
    private _options;
    private _panViewer;
    private _geo;
    private _prevNorthOffset;
    private _prevYaw;
    private _currImg;
    private _dataArr;
    private _dataIndex;
    private _sceneList;
    private _hotSpotList;
    private _prevImg;
    private _initLat;
    private _initLng;
    private optimalDist;
    private neighborDistCutoff;
    private pruneAngle;
    private _map;
    private _mapMarker;
    private _emitter;
    private _sequencesData;
    private _navArrowInfos;
    private _mouseOnDot;
    constructor(options?: TrailViewerOptions);
    private _createMapLayer;
    private _startMap;
    private _createMapMarker;
    private _updateMapMarkerRotation;
    private _updateNavArrows;
    setData(data: Image[]): void;
    getData(): Image[] | undefined;
    getCurrentImageID(): string | undefined;
    getFlipped(): boolean | undefined;
    getCurrentSequenceId(): number | undefined;
    getPanViewer(): PannellumViewer | undefined;
    private _createViewerConfig;
    private _addSceneToConfig;
    private _addImageToViewer;
    private _createNavArrows;
    private _addNeighborsToViewer;
    private _customMod;
    private _getNeighbors;
    private _initViewer;
    private _createNavContainer;
    private _fetchData;
    private _onImageChange;
    getNearestImageId(lat: number, lng: number, distCutoff?: number): string | undefined;
    getImageGeo(): {
        latitude: number;
        longitude: number;
    };
    destroy(): void;
    getBearing(): number | undefined;
    private _onHotSpotClicked;
    goToImageID(imageID: string, reset?: boolean): Promise<this | undefined>;
}
export {};
