/*
Author: Matthew Oros
Email: mjo1@clevelandmetroparks.com
*/

/** Structure of default options for TrailViewer */
const DefaultTrailViewerOptions = {
    'useURLHashing': false,
    'onSceneChangeFunc': null,
    'onGeoChangeFunc': null,
    'onHotSpotClickFunc': null,
    'onInitDoneFunc': null,
    'onArrowsAddedFunc': null,
    'navArrowMinAngle': -25,
    'navArrowMaxAngle': -20,
}

function angle180to360(angle) {
    if (angle < 0) {
        angle = 360 + angle;
    }
    return angle;
}

function angle360to180(angle) {
    if (angle > 180) {
        angle = -(360 - angle)
    }
    return angle;
}

function customMod(a, b) {
    return a - Math.floor(a / b) * b;
}

const baseURL = "https://trailview.cmparks.net"

/** Class for a 360 trail viewer */
class TrailViewer {
    /** 
     * Creates a TrailViewer object
     * @public
     * @param {Object} options - Options for viewer, default is DefaultTrailViewerOptions
     * @param {string} [initImageID = null] - Initial imageID to start with
     * @param {Object} [data = null] - Data array, if not provided then it is fetched
     * @param {Number} [lat = null] - Optional coordinates for starting at nearest image
     * @param {Number} [lng = null] - Optional coordinates for starting at nearest image
     * @returns {TrailViewer}
     */
    constructor (options, initImageID = null, data = null, lat = null, lng = null) {
        if (options === null) {
            options = DefaultTrailViewerOptions;
        }
        this._options = options;
        this._initImageID = initImageID;
        this._panViewer = null;
        this._infoJson = null;
        this._geo = {
            'latitude': 0.0,
            'longitude': 0.0,
        };
        this._prevNorthOffset = 0;
        this._prevYaw = 0;
        this._currImg = null;
        this._dataArr = data;
        this._dataIndex = {};
        this._sceneList = [];
        this._hotSpotList = [];
        this._prevImg;
        this._navArrowMinAngle = options.navArrowMinAngle;
        this._navArrowMaxAngle = options.navArrowMaxAngle;
        this._prevNavClickedYaw = 0;
        this._initLat = lat;
        this._initLng = lng;

        this.optimalDist = 4;
        this.neighborDistCutoff = 10;
        this.pruneAngle = 25;

        if (this._navArrowMinAngle == null) {
            this._navArrowMinAngle = DefaultTrailViewerOptions.navArrowMinAngle;
        }
        if (this._navArrowMaxAngle == null) {
            this._navArrowMaxAngle = DefaultTrailViewerOptions.navArrowMaxAngle;
        }
        if (this._dataArr === null) {
            this._fetchData();
        } else {
            this._initViewer();
        }
        return this;
    }

    /** 
     * Gets current options
     * @public
     * @returns {Object}
     */
    getOptions() {
        return this._options;
    }

    /** 
     * Sets an option
     * @public
     * @param {string} option - Option to change
     * @param {any} value - New value
     * @returns {TrailViewer}
     */
    setOption(option, value) {
        this._options[option] = value;
        return this;
    }

    setData(data) {
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

    /** 
     * Gets current ImageID
     * @public
     * @returns {string} Returns current ImageID
     */
    getCurrentImageID() {
        return this._currImg['id'];
    }

    /**
     * Returns true if image is flipped
     * @returns {boolean} Returns true if image is flipped
     */
    getFlipped() {
        return this._currImg['flipped'];
    }

    /**
     * Gets current SequenceName
     * @public
     * @returns {string} Returns current SequenceName
     */
    getCurrentSequenceName() {
        return this._currImg['sequenceName'];
    }

    /** 
     * Creates a config for the viewer
     * @private
     * @param {string} firstScene - First ImageID to start with
     * @returns {Object} Returns config object
     */
    _createViewerConfig(firstScene) {
        let config = {
            "default": {
                "firstScene": firstScene,
                "sceneFadeDuration": 1500,
                "compass": false,
                "autoLoad": true,
                "showControls": false,
                "crossOrigin": "use-credentials",
            },
            "scenes": {
                
            }
        }
        return config;
    }
    
    /** 
     * Adds scene to a provided config
     * @private
     * @param {Object} config - Config object
     * @param {Object} scene - Scene object to add
     * @returns {Object} Returns the modified config
     */
    _addSceneToConfig(config, scene) {
        config['scenes'][String(scene['id'])] = {
            'horizonPitch': scene['pitchCorrection'],
            'hfov': 120,
            'yaw': 0,
            'northOffset': scene['bearing'],
            'type': 'multires',
            'multiRes': {
                'basePath': baseURL + '/trails/' + scene['sequenceName'] + '/img/' + scene['id'],
                "path": "/%l/%s%y_%x",
                "extension": "jpg",
                "tileResolution": 512,
                "maxLevel": 3,
                "cubeResolution": 1832,
            }
        }
        return config;
    }
    
    /** 
     * Adds scene config to the viewer
     * @private
     * @param {Object} scene - Scene object to add
     * @param {String} [shtHash=null] - Preview image hash
     * @returns {TrailViewer}
     */
    _addSceneToViewer(scene, shtHash=null) {
        this._sceneList.push(scene['id']);
        let horizonPitch = scene['pitchCorrection'];
        let yaw = 180;
        if (!scene['flipped']) {
            horizonPitch *= -1;
            yaw = 0;
        }
        let config = {
            'horizonPitch': horizonPitch,
            'hfov': 120,
            'yaw': yaw,
            'northOffset': scene['bearing'],
            'type': 'multires',
            'multiRes': {
                'basePath': baseURL + '/trails/' + scene['sequenceName'] + '/img/' + scene['id'],
                "path": "/%l/%s%y_%x",
                "fallbackPath": "/fallback/%s",
                "extension": "jpg",
                "tileResolution": 512,
                "maxLevel": 3,
                "cubeResolution": 1832,
            }
        }
        if (shtHash != null) {
            config['multiRes']['shtHash'] = shtHash;
        }
        this._panViewer.addScene(scene['id'], config);
        
        return this;
    }
    
    /** 
     * Adds navigation arrows to viewer from neighbors array
     * @private
     * @param {Object[]} neighbors - Arrow of neighbor objects
     * @param {Boolean} [flipped=false] - If image is flipped
     * @returns {TrailViewer}
     */
    _addNeighborsToViewer(neighbors, flipped=false) {
        let requests = []
        let instance = this;
        for (let i = 0; i < neighbors.length; i++) {
            let req = $.getJSON(baseURL + "/api/preview.php", {
                    'id': neighbors[i]['id']
                },
                function (data, textStatus, jqXHR) {
                    instance._addSceneToViewer(neighbors[i], data['preview'])
                    instance._hotSpotList.push(neighbors[i]['id']);
                    let min = instance._navArrowMinAngle;
                    let max = instance._navArrowMaxAngle;
                    let pitch = (-((max - min) - (neighbors[i]['distance'] * (max - min)) / 9.0)) + max;
                    instance._panViewer.addHotSpot({
                        'id': neighbors[i]['id'],
                        'pitch': pitch, //-25
                        'yaw': neighbors[i]['neighborBearing'],
                        'cssClass': 'custom-hotspot',
                        'type': 'scene',
                        'clickHandlerFunc': instance._onNavArrowClick,
                        'clickHandlerArgs': {
                            'this': instance, 
                            'id': neighbors[i]['id'], 
                            'yaw': neighbors[i]['neighborBearing'],
                            'pitch': pitch,
                        }
                    });
                }
            );
            requests.push(req);
        }
        // Call onArrowsAddedFunc callback
        $.when(...requests).done(() => {
            if ('onArrowsAddedFunc' in instance._options) {
                instance._options.onArrowsAddedFunc(instance._panViewer.getConfig()['hotSpots']);
            }
        });
        
        return this;
    }

    /**
     * Called when a navigation arrow is clicked
     * @private
     * @param {Event} evt 
     * @param {Object} info 
     */
    _onNavArrowClick(evt, info) {
        info['this']._prevNavClickedYaw = info.yaw;
        info['this']._panViewer.loadScene(info.id, 'same', 'same', 'same');
    }

    /** 
     * Modulus calculation modified for negative numbers
     * @private
     * @param {Number} a
     * @param {Number} b
     * @returns {Number} Result
     */
    _customMod(a, b) {
        return a - Math.floor(a / b) * b;
    }

    /** 
     * Calculates neighbors based on provided imageID
     * @private
     * @param {Object} scene - Scene object to calculate neighbors from
     * @returns {Object[]} Returns arry of scene-like objects
     */
    _getNeighbors(scene) {
        const ruler = new CheapRuler(41, 'meters');
        let neighbors = [];
        for (let p = 0; p < this._dataArr.length; p++) {
            if (this._dataArr[p].id == scene['id']) {
                continue;
            }
            let distance = ruler.distance([scene['longitude'], scene['latitude']], [this._dataArr[p].longitude, this._dataArr[p].latitude]);
            if (distance <= this.neighborDistCutoff) {
                let brng = ruler.bearing([scene['longitude'], scene['latitude']], [this._dataArr[p].longitude, this._dataArr[p].latitude]);
                if (brng < 0) {
                    brng += 360;
                }
                let bearing = this._customMod((this._customMod((brng - scene['bearing']), 360) + 180), 360);
                let skip = false;
                for (let n = 0; n < neighbors.length; n++) {
                    let neighbor = neighbors[n];
                    let diff = (this._customMod(((neighbor.neighborBearing - bearing) + 180), 360) - 180);
                    if (Math.abs(diff) < this.pruneAngle) {
                        if (Math.abs(this.optimalDist - distance) < Math.abs(this.optimalDist - neighbor.distance)) {
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
                        'sequenceName': this._dataArr[p].sequenceName,
                        'id': this._dataArr[p].id,
                        'bearing': this._dataArr[p].bearing,
                        'neighborBearing': bearing,
                        'flipped': this._dataArr[p].flipped,
                        'distance': distance,
                        'latitude': this._dataArr[p].latitude,
                        'longitude': this._dataArr[p].longitude,
                        'shtHash': this._dataArr[p].shtHash,
                        'pitchCorrection': this._dataArr[p].pitchCorrection,
                    });
                }
            }
        }
        return neighbors;
    }

    /** 
     * Intialize the Viewer
     * @private
     * @returns {TrailViewer}
     */
    _initViewer() {
        // Create index for quick lookup of data points
        // Format: {'imageID': index, '27fjei9djc': 8, ...}
        for (let i = 0; i < this._dataArr.length; i++) {
            this._dataIndex[this._dataArr[i]['id']] = i;
        }

        // Set firstScene, if not specified then use first scene in data array
        if (this._initImageID == null) {
            if (this._initLat && this._initLng) {
                this._firstScene = this.getNearestImageId(this._initLat, this._initLng, Number.MAX_SAFE_INTEGER);
            } else {
                this._firstScene = this._dataArr[0]['id'];
            }
        } else {
            this._firstScene = this._initImageID;
        }
        let config = this._createViewerConfig(this._firstScene);
        this._currImg = this._dataArr[this._dataIndex[this._firstScene]];
        config = this._addSceneToConfig(config, this._currImg);
        this._sceneList.push(this._currImg['id']);
        this._panViewer = pannellum.viewer('panorama', config);

        // Set up onSceneChange event listener
        let instance = this;
        this._panViewer.on("scenechange", function(imgId) {
            instance._onSceneChange(imgId);
        });
        this._onSceneChange(this._panViewer.getScene());

        if (this._currImg.flipped) {
            this._panViewer.setYaw(180, false);
        } else {
            this._panViewer.setYaw(0, false);
        }
        
        let neighbors = this._getNeighbors(this._currImg);
        for (let i = 0; i < this._hotSpotList.length; i++) {
            this._panViewer.removeHotSpot(this._hotSpotList[i]);
        }
        this._addNeighborsToViewer(neighbors, this._currImg.flipped);
        if ('onInitDoneFunc' in this._options) {
            this._options.onInitDoneFunc(this);
        }
        return this;
    }

    /** 
     * Fetches data and then initializes viewer
     * @private
     */
    _fetchData() {
        let instance = this;
        $.getJSON(baseURL + '/api/images.php?type=standard', null,
            function (data, textStatus, jqXHR) {
                instance._dataArr = data['imagesStandard'];
                if (!instance._panViewer) {
                    instance._initViewer();
                } else {
                    instance.goToImageID(instance.getCurrentImageID());
                }
            }
        );
    }

    /**
     * Returns nearest hotspot from yaw angle
     * @private
     * @param {Number} yaw 
     * @returns {Object} Returns nearest hotspot config
     */
    _getNearestHotspot(yaw) {
        let config = this._panViewer.getConfig();
        let hotspots = config['hotSpots'];
        if (!hotspots) {
            return null;
        }
        let nearest = hotspots[0];
        let nearestDiff;
        for (let i = 0; i < hotspots.length; i++) {
            let diff = Math.abs(this._customMod(((angle180to360(hotspots[i].yaw) - yaw) + 180), 360) - 180);
            nearestDiff = Math.abs(this._customMod(((angle180to360(nearest.yaw) - yaw) + 180), 360) - 180);
            if (diff < nearestDiff) {
                nearest = hotspots[i];
                nearestDiff = diff;
            }
        }
        return nearest;
    }

    /** 
     * Called when a scene changes
     * @private
     * @param {string} img - the imageID
     */
    _onSceneChange(img) {
        this._currImg = this._dataArr[this._dataIndex[img]];

        // Keep the same bearing on scene change
        this._prevYaw = this._panViewer.getYaw();
        let newYaw = (((this._prevNorthOffset - this._panViewer.getNorthOffset()) % 360) + this._prevYaw) % 360;
        this._panViewer.setYaw(newYaw, false);
        this._prevNorthOffset = this._panViewer.getNorthOffset();

        // Update geo
        this._geo['latitude'] = this._dataArr[this._dataIndex[img]]['latitude'];
        this._geo['longitude'] = this._dataArr[this._dataIndex[img]]['longitude'];
        if ('onGeoChangeFunc' in this._options) {
            this._options.onGeoChangeFunc(this._geo);
        }

        // Remove previous hotspots
        for (let i = 0; i < this._hotSpotList.length; i++) {
            this._panViewer.removeHotSpot(this._hotSpotList[i], this._prevImg);
        }
        this._hotSpotList = []
        let hotspots = document.getElementsByClassName('pnlm-hotspot-base');
        for (let i = 0; i < hotspots.length; i++) {
            hotspots[i].remove();
        }

        // Remove scenes that are not in range
        let neighbors = this._getNeighbors(this._dataArr[this._dataIndex[img]]);
        let visibleScenes = [img];
        for (let i = 0; i < neighbors.length; i++) {
            visibleScenes.push(neighbors[i]['id']);
        }
        for (let i = 0; i < this._sceneList.length; i++) {
            if (!visibleScenes.includes(this._sceneList[i])) {
                this._panViewer.removeScene(this._sceneList[i]);
            }
        }
        this._sceneList = visibleScenes;
        this._prevImg = this._currImg;
        this._updateInfo();

        // Add nav arrows
        this._addNeighborsToViewer(neighbors, this._currImg.flipped);

        if ('onSceneChangeFunc' in this._options) {
            this._options.onSceneChangeFunc(this._currImg);
        }
    }

    /**
     * Gets nearest image ID to specified coordinates
     * @param {Number} lat 
     * @param {Number} lng 
     * @param {Number} [distCutoff = 10] - distance in meters 
     * @returns Returns null if not in cutoff, else returns image id
     */
    getNearestImageId(lat, lng, distCutoff = 10) {
        const ruler = new CheapRuler(41, 'meters');
        let minDist = Number.MAX_SAFE_INTEGER;
        let minId = null;
        for (let i = 0; i < this._dataArr.length; i++) {
            let dist = ruler.distance([lng, lat], [this._dataArr[i].longitude, this._dataArr[i].latitude]);
            if (dist < distCutoff) {
                if (dist < minDist) {
                    minId = this._dataArr[i].id;
                    minDist = dist;
                }
            }
        }
        return minId;
    }

    /** 
     * Get the latitude and longitude of the current image
     * @public
     * @returns {Object} Returns {'latitude': value, 'longitude': value}
     */
    getImageGeo() {
        return this._geo;
    }

    /** 
     * Stops the viewer and frees resources
     * @public
     */
    destroy() {
        if (this._panViewer != null) {
            this._panViewer.destroy();
        }
    }

    /** 
     * Gets the current bearing of the viewer
     * @public
     * @returns {Number} Returns the current bearing of the viewer
     */
    getBearing() {
        return (this._panViewer.getNorthOffset() + this._panViewer.getYaw() + 180) % 360;
    }

    /** 
     * Creates info in viewer
     * @private
     * @param {Object} infoJson
     */
    _createLocalInfo(infoJson) {
        if (this._infoJson != null) {
            for (let i = 0; i < this._infoJson['ImgInfo'].length; i++) {
                if (this._panViewer != null) {
                    this._panViewer.removeHotSpot(this._infoJson['ImgInfo'][i]['ID'], this._infoJson['ImgInfo'][i]['ImageID']);
                }
            }
        }
        this._infoJson = infoJson;
        let instance = this;
        for (let i = 0; i < infoJson['ImgInfo'].length; i++) {
            let info = infoJson['ImgInfo'][i]
            if (this._panViewer != null) {
                this._panViewer.addHotSpot({
                    'id': info['ID'],
                    'pitch': info['Pitch'],
                    'yaw': info['Yaw'],
                    'type': 'info',
                    'text': info['HoverText'],
                    'clickHandlerFunc': instance._onHotSpotClicked,
                    'clickHandlerArgs': [instance, info['ID']],
                }, info['ImageID'])
            }
        }
    }

    /** 
     * Called when info is clicked
     * @private
     * @param {Event} evt - Click event
     * @param {Object} info
     */
    _onHotSpotClicked(evt, info) {
        if ('onHotSpotClickFunc' in info[0]._options) {
            info[0]._options.onHotSpotClickFunc(info[1]);
        }
    }
    
    /**
     * Fetches and updates info in viewer
     * @private
     */
    _updateInfo() {
        var xmlhttp = new XMLHttpRequest();
        var url = baseURL + "/api/img_info.php?id=" + String(this._currImg['id']);
        let instance = this;
        xmlhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
               instance._createLocalInfo(JSON.parse(this.responseText));
            }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }

    /**
     * Goes to provided imageID
     * @public
     * @param {string} imageID
     * @returns {TrailViewer}
     */
    goToImageID(imageID) {
        if (!this._sceneList.includes(imageID)) {
            let instance = this;
            $.getJSON(baseURL + "/api/preview.php", {
                    'id': imageID
                },
                function (data, textStatus, jqXHR) {
                    instance._addSceneToViewer(instance._dataArr[instance._dataIndex[imageID]], data['preview'])
                    instance._panViewer.loadScene(imageID, 'same', 'same', 'same');
                }
            );
        } else {
            this._panViewer.loadScene(imageID, 'same', 'same', 'same');
        }
        return this;
    }
}