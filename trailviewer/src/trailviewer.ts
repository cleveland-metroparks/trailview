import 'mapbox-gl/dist/mapbox-gl.css';
import './styles/trailviewer.css';
import mapboxgl from 'mapbox-gl';
import {
    TrailViewerBase,
    TrailViewerBaseOptions,
    defaultBaseOptions,
} from './trailviewer-base';
import type { Image } from './trailviewer-base';
import urlJoin from 'url-join';

export interface TrailViewerOptions extends TrailViewerBaseOptions {
    mapboxKey: string | undefined;
    forceLayout: undefined | 'desktop' | 'mobile';
}

export const defaultOptions: TrailViewerOptions = {
    ...defaultBaseOptions,
    mapboxKey: undefined,
    forceLayout: undefined,
};

export class TrailViewer extends TrailViewerBase {
    private _extended_options: TrailViewerOptions;
    private _target: HTMLDivElement;
    private _mapTarget: HTMLDivElement;
    private _viewerTarget: HTMLDivElement;
    private _map: mapboxgl.Map | undefined;
    private _mouseOnDot = false;
    private _mapMarker: mapboxgl.Marker | undefined;
    private _layout: 'desktop' | 'mobile' = 'desktop';

    constructor(options: TrailViewerOptions = defaultOptions) {
        super({ ...options, target: 'trailviewerPanorama' });
        this._extended_options = options;
        const target = document.getElementById(
            options.target
        ) as HTMLDivElement | null;
        if (target === null) {
            throw new Error('Unable to find panorama target');
        }
        this._target = target;
        this._target.classList.add('trailview-main-container');
        this._viewerTarget = document.createElement('div');
        this._viewerTarget.id = 'trailviewerPanorama';
        this._viewerTarget.classList.add('trailview-viewer-container');
        if (this._extended_options.forceLayout === 'mobile') {
            this._viewerTarget.classList.add(
                'trailview-viewer-container-mobile'
            );
        } else {
            this._viewerTarget.classList.add(
                'trailview-viewer-container-desktop'
            );
        }
        this._target.appendChild(this._viewerTarget);
        this.on('image-change', (image: Image) => {
            if (this._map !== undefined && this._mapMarker !== undefined) {
                this._mapMarker.setLngLat(image.coordinates);
                this._map.easeTo({
                    center: this._mapMarker.getLngLat(),
                    duration: 500,
                });
            }
        });

        const mapContainer = document.createElement('div');
        mapContainer.id = 'trailviewerMap';
        mapContainer.classList.add('trailview-map-container');
        if (this._extended_options.forceLayout === 'mobile') {
            mapContainer.classList.add('trailview-map-container-mobile');
        } else {
            mapContainer.classList.add('trailview-map-container-desktop');
        }
        this._mapTarget = mapContainer;
        this._target.appendChild(mapContainer);

        this._initMap();

        new ResizeObserver(this._onResize.bind(this)).observe(this._target);
        let lastMapResize: Date = new Date();
        new ResizeObserver(() => {
            if (new Date().valueOf() - lastMapResize.valueOf() > 80) {
                this._map?.resize();
                lastMapResize = new Date();
            }
        }).observe(this._mapTarget);
        let lastViewerResize: Date = new Date();
        new ResizeObserver(() => {
            if (new Date().valueOf() - lastViewerResize.valueOf() > 80) {
                this.resize();
                lastViewerResize = new Date();
            }
        }).observe(this._viewerTarget);

        this._viewerTarget.addEventListener('transitionend', () => {
            this.resize();
        });

        this._mapTarget.addEventListener('transitionend', () => {
            this._map?.resize();
            if (this._mapMarker !== undefined) {
                this._map?.easeTo({
                    center: this._mapMarker.getLngLat(),
                    duration: 500,
                });
            }
        });
    }

    private _changeLayout(layout: typeof this._layout) {
        if (this._extended_options.forceLayout !== undefined) {
            return;
        }
        if (this._layout === 'desktop' && layout === 'mobile') {
            this._mapTarget.classList.remove('trailview-map-container-desktop');
            this._mapTarget.classList.add('trailview-map-container-mobile');
            this._viewerTarget.classList.remove(
                'trailview-viewer-container-desktop'
            );
            this._viewerTarget.classList.add(
                'trailview-viewer-container-mobile'
            );
            this._map?.resize();
        } else if (this._layout === 'mobile' && layout === 'desktop') {
            this._mapTarget.classList.remove('trailview-map-container-mobile');
            this._mapTarget.classList.add('trailview-map-container-desktop');
            this._viewerTarget.classList.remove(
                'trailview-viewer-container-mobile'
            );
            this._viewerTarget.classList.add(
                'trailview-viewer-container-desktop'
            );
            this._map?.resize();
        }
        this._layout = layout;
    }

    private _onResize() {
        const width = this._target.offsetWidth;
        if (width < 600) {
            this._changeLayout('mobile');
        } else {
            this._changeLayout('desktop');
        }
    }

    private _initMap() {
        if (this._extended_options.mapboxKey === undefined) {
            throw new Error('No mapbox key specified');
        }
        mapboxgl.accessToken = this._extended_options.mapboxKey;
        this._map = new mapboxgl.Map({
            container: this._mapTarget,
            style: 'mapbox://styles/cleveland-metroparks/cisvvmgwe00112xlk4jnmrehn?optimize=true',
            center: [-81.682665, 41.4097766],
            zoom: 9.5,
            pitchWithRotate: false,
            dragRotate: false,
            touchPitch: false,
            boxZoom: false,
        });

        const nav = new mapboxgl.NavigationControl({
            showCompass: false,
        });
        this._map.addControl(nav, 'bottom-right');

        this._map.on('load', () => {
            this._createMapLayer();
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

    private _createMapLayer() {
        if (this._map === undefined) {
            throw new Error('Cannot create map layer as map is undefined');
        }
        if (this._map.getSource('dots')) {
            this._map.removeLayer('dots');
            this._map.removeSource('dots');
        }
        const layerData: mapboxgl.SourceSpecification = {
            type: 'vector',
            format: 'pbf',
            tiles: [
                urlJoin(
                    this._extended_options.baseUrl,
                    '/api/tiles/{z}/{x}/{y}/',
                    this._extended_options.fetchPrivate ? '?private' : ''
                ),
            ],
        };

        this._map.addSource('dots', layerData);

        const layer: mapboxgl.LayerSpecification = {
            id: 'dots',
            'source-layer': 'geojsonLayer',
            source: 'dots',
            type: 'circle',
            paint: {
                'circle-radius': 10,
                'circle-color': [
                    'case',
                    ['==', ['get', 'public'], true],
                    '#00a108',
                    '#db8904',
                ],
            },
        };
        if (
            this._extended_options.filterSequences !== undefined &&
            this._extended_options.filterGroups === undefined
        ) {
            layer.filter = [
                'in',
                ['get', 'sequenceId'],
                ['literal', this._extended_options.filterSequences],
            ];
        } else if (
            this._extended_options.filterSequences === undefined &&
            this._extended_options.filterGroups !== undefined
        ) {
            layer.filter = [
                'any',
                ...this._extended_options.filterGroups.map((f) => {
                    return ['in', f, ['get', 'groupIds']];
                }),
            ];
        } else if (
            this._extended_options.filterSequences !== undefined &&
            this._extended_options.filterGroups !== undefined
        ) {
            layer.filter = [
                'any',
                [
                    'in',
                    ['get', 'sequenceId'],
                    ['literal', this._extended_options.filterSequences],
                ],
                ...this._extended_options.filterGroups.map((f) => {
                    return ['in', f, ['get', 'groupIds']];
                }),
            ];
        }
        this._map.addLayer(layer);
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
        if (this._mapMarker !== undefined) {
            const angle = this.getBearing();
            if (angle !== undefined) {
                this._mapMarker.setRotation((angle + 225) % 360);
            }
        }
        if (this._destroyed === false) {
            requestAnimationFrame(this._updateMapMarkerRotation.bind(this));
        }
    }

    public destroy() {
        super.destroy();
        if (this._map !== undefined) {
            this._map.remove();
        }
        this._destroyed = true;
    }
}
