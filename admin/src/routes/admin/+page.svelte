<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { TrailViewer, defaultTrailViewerOptions } from '$lib/trailviewer';
	import { PUBLIC_MAPBOX_KEY } from '$env/static/public';
	// import 'trailviewer/dist/styles.css';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import '$lib/trailviewer.css';
	import { goto } from '$app/navigation';

	let trailviewer: TrailViewer | undefined;

	let currentImageId: string;
	let currentSequenceName: string;
	let pitchCorrection = 0;

	onMount(async () => {
		let trailviewerOptions = defaultTrailViewerOptions;
		trailviewerOptions.mapboxKey = PUBLIC_MAPBOX_KEY;
		trailviewer = new TrailViewer();
		trailviewer.on('image-change', (image) => {
			currentImageId = image.id;
			currentSequenceName = image.sequenceId.toString();
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

<div style="position:relative">
	<h1 class="mt-3" style="text-align:center">TrailView Admin</h1>
	<button
		on:click={async () => {
			const res = await fetch('/logout', { method: 'POST' });
			const data = await res.json();
			if (data.success === true) {
				goto('/login');
			}
		}}
		style="position:absolute; bottom:0; right: 0"
		type="button"
		class="btn btn-secondary">Logout</button
	>
</div>

<hr />
<div class="row mb-5">
	<div class="col-lg-8">
		<div id="viewer-container">
			<div id="trailview_panorama" style="" />
		</div>
		<div id="trailview_map" />
	</div>
	<div class="col-lg-4">
		<h4 class="mt-3">Sequence Options</h4>
		<label for="sequence_name">Sequence Name</label>
		<input id="sequence_name" readonly class="form-control" bind:value={currentSequenceName} />
		<div class="mt-2 form-check form-switch">
			<input id="sequence_public_switch" class="form-check-input" type="checkbox" role="switch" />
			<label class="form-check-label" for="sequence_public_switch">Publicly Visible</label>
		</div>
		<div class="mt-2 form-check form-switch">
			<input id="flip_switch" class="form-check-input" type="checkbox" role="switch" />
			<label class="form-check-label" for="flip_switch">Flip 180&deg;</label>
		</div>
		<label for="pitch_range" class="mt-2 form-label">Pitch Correction: {pitchCorrection}</label>
		<input
			bind:value={pitchCorrection}
			type="range"
			class="form-range"
			id="pitch_range"
			min="-90"
			max="90"
			step="1"
		/>
		<button type="button" class="btn btn-secondary">Reset</button>
		<button type="button" class="btn btn-secondary">View from Side</button>
		<button type="button" class="btn btn-primary">Set Pitch</button>

		<hr />

		<h4 class="mt-3">Image Options</h4>
		<label for="image_id">Image Id</label>
		<input id="image_id" readonly class="form-control" bind:value={currentImageId} />
		<div class="mt-2 form-check form-switch">
			<input id="image_public_switch" class="form-check-input" type="checkbox" role="switch" />
			<label class="form-check-label" for="image_public_switch">Publicly Visible</label>
		</div>
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
