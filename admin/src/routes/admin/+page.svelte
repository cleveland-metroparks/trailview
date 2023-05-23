<script lang="ts">
	import { onMount } from 'svelte';
	import { TrailViewer } from '$lib/trailviewer';

	onMount(async () => {
		const trailviewer = new TrailViewer();
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
