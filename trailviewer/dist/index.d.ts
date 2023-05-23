export interface TrailViewerOptions {
    useURLHashing: boolean;
    onSceneChangeFunc: Function | null;
    onGeoChangeFunc: Function | null;
    onHotSpotClickFunc: Function | null;
    onInitDoneFunc: Function | null;
    onArrowsAddedFunc: Function | null;
    navArrowMinAngle: number;
    navArrowMaxAngle: number;
    imageFetchType: 'standard' | 'all';
}
export declare const defaultTrailViewerOptions: TrailViewerOptions;
export declare class TrailViewer {
    private _options;
    private _initImageId;
    private _panViewer;
    private _infoJson;
    private _geo;
    private _prevNorthOffset;
    private _prevYaw;
    private _currImg;
    private _dataArr;
    private _dataIndex;
    private _sceneList;
    private _hotSpotList;
    private _prevImg;
    private _navArrowMinAngle;
    private _navArrowMaxAngle;
    private _prevNavClickedYaw;
    private _initLat;
    private _initLng;
    private _imageFetchType;
    private optimalDist;
    private neighborDistCutoff;
    private pruneAngle;
    private _firstScene;
    constructor(options: TrailViewerOptions, initImageId: string | null, data?: null, lat?: null, lng?: null);
    getOptions(): TrailViewerOptions;
    setData(data: any[]): void;
    getCurrentImageID(): string | undefined;
    getFlipped(): boolean;
    getCurrentSequenceName(): string;
    _createViewerConfig(firstScene: string): any;
    _addSceneToConfig(config: any, scene: any): any;
    _addSceneToViewer(scene: any, shtHash?: string | null): TrailViewer;
    /**
     * Adds navigation arrows to viewer from neighbors array
     * */
    _addNeighborsToViewer(neighbors: any[], flipped?: boolean): Promise<void>;
    /**
     * Called when a navigation arrow is clicked
     */
    _onNavArrowClick(evt: Event, info: any): void;
    _customMod(a: number, b: number): number;
    /**
     * Calculates neighbors based on provided imageID
     * Returns array of scene-like objects
     */
    _getNeighbors(scene: any): any[] | null;
    _initViewer(): void;
    /**
     * Fetches data and then initializes viewer
     * @private
     */
    _fetchData(): Promise<any[]>;
    /**
     * Returns nearest hotspot from yaw angle
     * Returns nearest hotspot config
     */
    _getNearestHotspot(yaw: number): any;
    _onSceneChange(img: string): void;
    /**
     * Gets nearest image ID to specified coordinates
     * Returns null if not in cutoff, else returns image id
     */
    getNearestImageId(lat: number, lng: number, distCutoff?: number): string | null;
    getImageGeo(): {
        latitude: number;
        longitude: number;
    };
    destroy(): void;
    getBearing(): number;
    /**
     * Creates info in viewer
     */
    _createLocalInfo(infoJson: any): void;
    /**
     * Called when info is clicked
     */
    _onHotSpotClicked(evt: Event, info: any): void;
    goToImageID(imageID: string, reset?: boolean): Promise<this>;
}
