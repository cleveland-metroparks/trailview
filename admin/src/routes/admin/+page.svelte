<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { TrailViewer, defaultTrailViewerOptions } from '$lib/trailviewer';
	import { PUBLIC_MAPBOX_KEY } from '$env/static/public';
	// import 'trailviewer/dist/styles.css';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import '$lib/trailviewer.css';

	let trailviewer: TrailViewer | undefined;
	onMount(async () => {
		let trailviewerOptions = defaultTrailViewerOptions;
		trailviewerOptions.mapboxKey = PUBLIC_MAPBOX_KEY;
		trailviewer = new TrailViewer();
	});

	onDestroy(() => {
		if (trailviewer) {
			trailviewer.destroy();
		}
	});
</script>

<svelte:head>
	<script
		src="https://cdn.jsdelivr.net/gh/orosmatthew/pannellum-metroparks@trailview/build/pannellum.js"
	></script>
	<link
		rel="stylesheet"
		href="https://cdn.jsdelivr.net/gh/orosmatthew/pannellum-metroparks@trailview/build/pannellum.css"
	/>
</svelte:head>

<h1 style="text-align:center">TrailView Admin</h1>
<hr />

<div id="viewer-container">
	<div
		id="trailview_panorama"
		style="margin: 0; padding: 0; width: 100%; height: 600px; background-color: D6D6D6;"
	/>
	<div id="trailview_map" />
</div>
