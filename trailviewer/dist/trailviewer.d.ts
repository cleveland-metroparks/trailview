import 'mapbox-gl/dist/mapbox-gl.css';
import './styles/trailviewer.css';
import { TrailViewerBase, TrailViewerBaseOptions } from './trailviewer-base';
export interface TrailViewerOptions extends TrailViewerBaseOptions {
    mapboxKey: string | undefined;
    forceLayout: undefined | 'desktop' | 'mobile';
}
export declare const defaultOptions: TrailViewerOptions;
export declare class TrailViewer extends TrailViewerBase {
    private _extended_options;
    private _target;
    private _mapTarget;
    private _viewerTarget;
    private _map;
    private _mouseOnDot;
    private _mapMarker;
    private _layout;
    constructor(options?: TrailViewerOptions);
    private _changeLayout;
    private _onResize;
    private _initMap;
    private _createMapLayer;
    private _createMapMarker;
    private _updateMapMarkerRotation;
    destroy(): void;
}
