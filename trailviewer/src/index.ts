import CheapRuler from 'cheap-ruler';

declare var pannellum: any;
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
    imageFetchType: 'standard',
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
    private _prevNorthOffset: number = 0;
    private _prevYaw: number = 0;
    private _currImg: any;
    private _dataArr: any[] | undefined;
    private _dataIndex: any = {};
    private _sceneList: any[] = [];
    private _hotSpotList: any[] = [];
    private _prevImg: string | null = null;
    private _prevNavClickedYaw: number = 0;
    private _initLat: number | undefined;
    private _initLng: number | undefined;
    private optimalDist = 4;
    private neighborDistCutoff = 10;
    private pruneAngle = 25;
    private _firstScene: any = null;

    constructor(
        options: TrailViewerOptions = defaultTrailViewerOptions,
        initImageId: string | undefined,
        data = undefined,
        lat = undefined,
        lng = undefined
    ) {
        this._options = options;
        this._currImg = initImageId;
        if (data !== null) {
            this._dataArr = data;
        } else {
            this._dataArr = undefined;
            this._fetchData().then((dataArr: any[]) => {
                this._dataArr = dataArr;
                if (this._panViewer !== null) {
                    this._initViewer();
                } else {
                    // Create index for quick lookup of data points
                    // Format: {'imageID': index, '27fjei9djc': 8, ...}
                    for (let i = 0; i < this._dataArr.length; i++) {
                        this._dataIndex[this._dataArr[i]['id']] = i;
                    }
                    if (this._currImg) {
                        this.goToImageID(this._currImg['id'], true);
                    }
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
        this._addSceneToViewer(
            this._dataArr[this._dataIndex[this._currImg['id']]]
        );
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

    _createViewerConfig(firstScene: string): any {
        let config = {
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

    _addSceneToConfig(config: any, scene: any): any {
        config['scenes'][String(scene['id'])] = {
            horizonPitch: scene['pitchCorrection'],
            hfov: 120,
            yaw: 0,
            northOffset: scene['bearing'],
            type: 'multires',
            multiRes: {
                basePath:
                    baseURL +
                    '/trails/' +
                    scene['sequenceName'] +
                    '/img/' +
                    scene['id'],
                path: '/%l/%s%y_%x',
                extension: 'jpg',
                tileResolution: 512,
                maxLevel: 3,
                cubeResolution: 1832,
            },
        };
        return config;
    }

    _addSceneToViewer(scene: any, shtHash: string | null = null): TrailViewer {
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
        let config = {
            horizonPitch: horizonPitch,
            hfov: 120,
            yaw: yaw,
            northOffset: bearing,
            type: 'multires',
            multiRes: {
                basePath:
                    baseURL +
                    '/trails/' +
                    scene['sequenceName'] +
                    '/img/' +
                    scene['id'],
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
        this._panViewer.addScene(scene['id'], config);

        return this;
    }

    /**
     * Adds navigation arrows to viewer from neighbors array
     * */
    async _addNeighborsToViewer(neighbors: any[], flipped: boolean = false) {
        let instance = this;
        for (let i = 0; i < neighbors.length; i++) {
            const req = await fetch(`${baseURL}/api/preview.php`, {
                method: 'GET',
                body: JSON.stringify({
                    id: neighbors[i]['id'],
                }),
            });

            const data = await req.json();

            instance._addSceneToViewer(neighbors[i], data['preview']);
            instance._hotSpotList.push(neighbors[i]['id']);
            let min = instance._navArrowMinAngle;
            let max = instance._navArrowMaxAngle;
            let pitch =
                -(max - min - (neighbors[i]['distance'] * (max - min)) / 9.0) +
                max;
            let yaw = neighbors[i]['neighborBearing'];
            if (!flipped) {
                yaw = customMod(neighbors[i]['neighborBearing'] + 180, 360);
            }
            instance._panViewer.addHotSpot({
                id: neighbors[i]['id'],
                pitch: pitch, //-25
                yaw: yaw,
                cssClass: 'custom-hotspot',
                type: 'scene',
                clickHandlerFunc: instance._onNavArrowClick,
                clickHandlerArgs: {
                    this: instance,
                    id: neighbors[i]['id'],
                    yaw: neighbors[i]['neighborBearing'],
                    pitch: pitch,
                },
            });
        }
        if (instance._options.onArrowsAddedFunc !== null) {
            instance._options.onArrowsAddedFunc(
                instance._panViewer.getConfig()['hotSpots']
            );
        }
    }

    /**
     * Called when a navigation arrow is clicked
     */
    _onNavArrowClick(evt: Event, info: any) {
        info['this']._prevNavClickedYaw = info.yaw;
        info['this']._panViewer.loadScene(info.id, 'same', 'same', 'same');
    }

    _customMod(a: number, b: number): number {
        return a - Math.floor(a / b) * b;
    }

    /**
     * Calculates neighbors based on provided imageID
     * Returns array of scene-like objects
     */
    _getNeighbors(scene: any): any[] | null {
        const ruler = new CheapRuler(41, 'meters');
        let neighbors: any[] = [];
        if (this._dataArr === null) {
            return null;
        }
        for (let p = 0; p < this._dataArr.length; p++) {
            if (this._dataArr[p].id == scene['id']) {
                continue;
            }
            let distance = ruler.distance(
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
                let bearing = this._customMod(
                    this._customMod(brng - scene['bearing'], 360) + 180,
                    360
                );
                let skip = false;
                for (let n = 0; n < neighbors.length; n++) {
                    let neighbor = neighbors[n];
                    let diff =
                        this._customMod(
                            neighbor.neighborBearing - bearing + 180,
                            360
                        ) - 180;
                    if (Math.abs(diff) < this.pruneAngle) {
                        if (
                            Math.abs(this.optimalDist - distance) <
                            Math.abs(this.optimalDist - neighbor.distance)
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
                        pitchCorrection: this._dataArr[p].pitchCorrection,
                    });
                }
            }
        }
        return neighbors;
    }

    _initViewer() {
        if (this._dataArr === null) {
            console.error('Cannot initialize viewer because dataArr is null');
            return;
        }
        // Create index for quick lookup of data points
        // Format: {'imageID': index, '27fjei9djc': 8, ...}
        for (let i = 0; i < this._dataArr.length; i++) {
            this._dataIndex[this._dataArr[i]['id']] = i;
        }

        // Set firstScene, if not specified then use first scene in data array
        if (this._initImageId == null) {
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
            this._firstScene = this._initImageId;
        }
        let config = this._createViewerConfig(this._firstScene);
        this._currImg = this._dataArr[this._dataIndex[this._firstScene]];
        config = this._addSceneToConfig(config, this._currImg);
        this._sceneList.push(this._currImg['id']);
        this._panViewer = pannellum.viewer('panorama', config);

        // Set up onSceneChange event listener
        let instance = this;
        this._panViewer.on('scenechange', function (imgId: any) {
            instance._onSceneChange(imgId);
        });
        this._onSceneChange(this._panViewer.getScene());

        if (this._currImg.flipped) {
            this._panViewer.setYaw(180, false);
        } else {
            this._panViewer.setYaw(0, false);
        }

        let neighbors = this._getNeighbors(this._currImg);
        if (neighbors === null) {
            return;
        }
        for (let i = 0; i < this._hotSpotList.length; i++) {
            this._panViewer.removeHotSpot(this._hotSpotList[i]);
        }
        this._addNeighborsToViewer(neighbors, this._currImg.flipped);
        if (this._options.onInitDoneFunc !== null) {
            this._options.onInitDoneFunc(this);
        }
    }

    /**
     * Fetches data and then initializes viewer
     * @private
     */
    async _fetchData(): Promise<any[]> {
        let instance = this;
        if (this._imageFetchType == 'standard') {
            const res = await fetch(`${baseURL}/api/images.php?type=standard`);
            const data = await res.json();
            return data['imagesStandard'];
        } else {
            const res = await fetch(`${baseURL}/api/images.php?type=all`);
            const data = await res.json();

            instance._dataArr = data['imagesAll'];
            return data['imagesAll'];
        }
    }

    /**
     * Returns nearest hotspot from yaw angle
     * Returns nearest hotspot config
     */
    _getNearestHotspot(yaw: number): any {
        let config = this._panViewer.getConfig();
        let hotspots = config['hotSpots'];
        if (!hotspots) {
            return null;
        }
        let nearest = hotspots[0];
        let nearestDiff;
        for (let i = 0; i < hotspots.length; i++) {
            let diff = Math.abs(
                this._customMod(
                    angle180to360(hotspots[i].yaw) - yaw + 180,
                    360
                ) - 180
            );
            nearestDiff = Math.abs(
                this._customMod(angle180to360(nearest.yaw) - yaw + 180, 360) -
                    180
            );
            if (diff < nearestDiff) {
                nearest = hotspots[i];
                nearestDiff = diff;
            }
        }
        return nearest;
    }

    _onSceneChange(img: string) {
        if (this._dataArr === null) {
            console.error('Error on scene change, dataArr is null');
            return;
        }
        this._currImg = this._dataArr[this._dataIndex[img]];

        // Keep the same bearing on scene change
        this._prevYaw = this._panViewer.getYaw();
        let newYaw =
            (((this._prevNorthOffset - this._panViewer.getNorthOffset()) %
                360) +
                this._prevYaw) %
            360;
        this._panViewer.setYaw(newYaw, false);
        this._prevNorthOffset = this._panViewer.getNorthOffset();

        // Update geo
        this._geo['latitude'] = this._dataArr[this._dataIndex[img]]['latitude'];
        this._geo['longitude'] =
            this._dataArr[this._dataIndex[img]]['longitude'];

        if (this._options.onGeoChangeFunc !== null) {
            this._options.onGeoChangeFunc(this._geo);
        }

        // Remove previous hotspots
        for (let i = 0; i < this._hotSpotList.length; i++) {
            this._panViewer.removeHotSpot(this._hotSpotList[i], this._prevImg);
        }
        this._hotSpotList = [];
        let hotspots = document.getElementsByClassName('pnlm-hotspot-base');
        for (let i = 0; i < hotspots.length; i++) {
            hotspots[i].remove();
        }

        // Remove scenes that are not in range
        let neighbors = this._getNeighbors(this._dataArr[this._dataIndex[img]]);
        let visibleScenes = [img];
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

        if (this._options.onSceneChangeFunc !== null) {
            this._options.onSceneChangeFunc(this._currImg);
        }
    }

    /**
     * Gets nearest image ID to specified coordinates
     * Returns null if not in cutoff, else returns image id
     */
    getNearestImageId(
        lat: number,
        lng: number,
        distCutoff: number = 10
    ): string | null {
        const ruler = new CheapRuler(41, 'meters');
        let minDist = Number.MAX_SAFE_INTEGER;
        let minId: string | null = null;
        if (this._dataArr === null) {
            return null;
        }
        for (let i = 0; i < this._dataArr.length; i++) {
            let dist = ruler.distance(
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
        return (
            (this._panViewer.getNorthOffset() +
                this._panViewer.getYaw() +
                180) %
            360
        );
    }

    /**
     * Creates info in viewer
     */
    _createLocalInfo(infoJson: any) {
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
        let instance = this;
        for (let i = 0; i < infoJson['ImgInfo'].length; i++) {
            let info = infoJson['ImgInfo'][i];
            if (this._panViewer != null) {
                this._panViewer.addHotSpot(
                    {
                        id: info['ID'],
                        pitch: info['Pitch'],
                        yaw: info['Yaw'],
                        type: 'info',
                        text: info['HoverText'],
                        clickHandlerFunc: instance._onHotSpotClicked,
                        clickHandlerArgs: [instance, info['ID']],
                    },
                    info['ImageID']
                );
            }
        }
    }

    /**
     * Called when info is clicked
     */
    _onHotSpotClicked(evt: Event, info: any) {
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
            let instance = this;
            const res = await fetch(`${baseURL}/api/preview.php`, {
                method: 'GET',
                body: JSON.stringify({
                    id: imageID,
                }),
            });
            const data = await res.json();

            if (instance._dataArr !== null) {
                instance._addSceneToViewer(
                    instance._dataArr[instance._dataIndex[imageID]],
                    data['preview']
                );
            }
            instance._panViewer.loadScene(imageID, 'same', 'same', 'same');
        } else {
            this._panViewer.loadScene(imageID, 'same', 'same', 'same');
        }
        return this;
    }
}
