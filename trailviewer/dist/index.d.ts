import 'mapbox-gl/dist/mapbox-gl.css';
import './styles/index.css';
export interface TrailViewerOptions {
    panoramaTarget: string;
    mapTarget: string;
    baseUrl: string;
    mapboxKey: string | undefined;
    navArrowMinAngle: number;
    navArrowMaxAngle: number;
    imageFetchType: 'standard' | 'all';
}
export declare const defaultTrailViewerOptions: TrailViewerOptions;
export declare class TrailViewer {
    private _options;
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
    private _prevNavClickedYaw;
    private _initLat;
    private _initLng;
    private optimalDist;
    private neighborDistCutoff;
    private pruneAngle;
    private _firstScene;
    private _map;
    private _mapMarker;
    constructor(options?: TrailViewerOptions, initImageId?: string | undefined, data?: undefined, lat?: undefined, lng?: undefined);
    private _createMapLayer;
    private _startMap;
    setData(data: any[]): void;
    getData(): any;
    getCurrentImageID(): string | undefined;
    getFlipped(): boolean;
    getCurrentSequenceName(): string;
    private _createViewerConfig;
    private _addSceneToConfig;
    private _addSceneToViewer;
    /**
     * Adds navigation arrows to viewer from neighbors array
     * */
    private _addNeighborsToViewer;
    /**
     * Called when a navigation arrow is clicked
     */
    private _onNavArrowClick;
    private _customMod;
    /**
     * Calculates neighbors based on provided imageID
     * Returns array of scene-like objects
     */
    private _getNeighbors;
    private _initViewer;
    /**
     * Fetches data and then initializes viewer
     * @private
     */
    private _fetchData;
    /**
     * Returns nearest hotspot from yaw angle
     * Returns nearest hotspot config
     */
    private _getNearestHotspot;
    private _onSceneChange;
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
    private _createLocalInfo;
    /**
     * Called when info is clicked
     */
    private _onHotSpotClicked;
    goToImageID(imageID: string, reset?: boolean): Promise<this>;
}
