<script lang="ts">
	import { onMount } from 'svelte';
	import { TrailViewer, defaultTrailViewerOptions } from 'trailviewer/dist';

	onMount(async () => {
		const trailviewer = new TrailViewer(defaultTrailViewerOptions, null, null, null, null);
		setTimeout(() => {
			console.log(trailviewer);
			trailviewer._initViewer();
		}, 2000);
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
		id="panorama"
		style="margin: 0; padding: 0; width: 100%; height: 600px; background-color: D6D6D6;"
	/>
	<div id="map" />
</div>

<style global>
	#viewer-container {
		width: 100%;
		height: 600px;
		position: relative;
	}

	#panorama {
		width: 100%;
		height: 100%;

		position: absolute;
		top: 0;
		left: 0;
	}

	#map {
		width: 100%;
		height: 600px;
		position: relative;
		z-index: 5;
		top: 600px;
	}

	#nav_arrows_container {
		position: absolute;
		margin: 0;
		width: 35%;
		height: 45%;
		left: 50%;
		bottom: 10%;
		transform: translateX(-50%);
	}

	.inside {
		position: absolute;
		width: 100%;
		height: 100%;

		background-color: gray;
		display: block;
	}

	.nav_arrow_new {
		position: absolute;
		top: 50%;
		left: 50%;
	}
</style>
