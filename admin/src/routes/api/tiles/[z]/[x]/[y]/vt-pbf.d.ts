declare module 'vt-pbf' {
	declare class GeoJSONWrapper {
		public name: string;
		public version: number;
		constructor(features: geojsonvt.Features);
	}
	function fromVectorTileJs({layers: { geojsonLayer: GeoJSONWrapper }}): object;
}
