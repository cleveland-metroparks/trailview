<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { TrailViewer, defaultTrailViewerOptions } from '$lib/trailviewer';
	import { PUBLIC_MAPBOX_KEY } from '$env/static/public';
	// import 'trailviewer/dist/styles.css';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import '$lib/trailviewer.css';

	let trailviewer: TrailViewer | undefined;

	let currentImageId: string;
	let currentSequenceName: string;

	onMount(async () => {
		let trailviewerOptions = defaultTrailViewerOptions;
		trailviewerOptions.mapboxKey = PUBLIC_MAPBOX_KEY;
		trailviewer = new TrailViewer();
		trailviewer.on('image-change', (image) => {
			currentImageId = image.id;
			currentSequenceName = image.sequenceName;
		});
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

<h1 class="mt-3" style="text-align:center">TrailView Admin</h1>
<hr />
<div class="row">
	<div class="col-lg-8">
		<div id="viewer-container">
			<div id="trailview_panorama" style="" />
		</div>
		<div id="trailview_map" />
	</div>
	<div class="col-lg-4">
		<label for="image_id">Image Id</label>
		<input id="image_id" readonly class="form-control" bind:value={currentImageId} />
		<label for="sequence_name">Sequence Name</label>
		<input id="sequence_name" readonly class="form-control" bind:value={currentSequenceName} />
	</div>
</div>

<style>
	#viewer-container {
		width: 100%;
		height: 450px;
	}

	#trailview_panorama {
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		background-color: D6D6D6;
	}

	#trailview_map {
		width: 100%;
		height: 350px;
		z-index: 5;
	}
</style>
