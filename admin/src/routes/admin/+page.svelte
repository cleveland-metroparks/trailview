<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { TrailViewer, defaultTrailViewerOptions, type Image } from '$lib/trailviewer';
	import { PUBLIC_MAPBOX_KEY } from '$env/static/public';
	// import 'trailviewer/dist/styles.css';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import '$lib/trailviewer.css';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	let trailviewer: TrailViewer | undefined;

	let currentSequenceName: string;
	let pitchCorrection = 0;
	let flippedValue: boolean;
	let currentImage: Image | undefined;
	let isSequencePublic: boolean;

	function onSequenceSelectChange(event: Event) {
		if (trailviewer === undefined) {
			return;
		}
		const trailviewData = trailviewer.getData();
		if (!trailviewData) {
			return;
		}
		const image = trailviewData.find((image) => {
			const sequence = data.sequences.find((sequence) => {
				return sequence.id === image.sequenceId;
			});
			if (!sequence) {
				return;
			}
			return sequence.name === (event.target as HTMLSelectElement).value;
		});
		if (image) {
			trailviewer.goToImageID(image.id);
		}
	}

	onMount(async () => {
		let trailviewerOptions = defaultTrailViewerOptions;
		trailviewerOptions.mapboxKey = PUBLIC_MAPBOX_KEY;
		trailviewerOptions.imageFetchType = 'all';
		trailviewer = new TrailViewer();
		trailviewer.on('image-change', (image) => {
			currentImage = image;
			currentSequenceName = image.sequenceId.toString();
			flippedValue = image.flipped;
			pitchCorrection = image.pitchCorrection;
			isSequencePublic = image.visibility;
			const sequence = data.sequences.find((sequence) => {
				return sequence.id === image.sequenceId;
			});
			if (sequence) {
				currentSequenceName = sequence.name;
			}
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
		<h4 class="mt-3">Go To Sequence</h4>
		<select on:change={onSequenceSelectChange} class="form-select">
			{#each data.sequences as sequence}
				<option class="sequence-option" id={`sequence_${sequence.id}`}>{sequence.name}</option>
			{/each}
		</select>
		<h4 class="mt-3">Sequence Options</h4>
		<label for="sequence_name">Sequence Name</label>
		<input id="sequence_name" readonly class="form-control" bind:value={currentSequenceName} />
		<div class="mt-2 form-check form-switch">
			<input
				id="sequence_public_switch"
				class="form-check-input"
				type="checkbox"
				role="switch"
				checked={(() => {
					return currentImage?.visibility ?? false;
				})()}
			/>
			<label class="form-check-label" for="sequence_public_switch">Publicly Visible</label>
		</div>
		<div class="mt-2 form-check form-switch">
			<input
				bind:value={flippedValue}
				id="flip_switch"
				class="form-check-input"
				type="checkbox"
				role="switch"
				bind:checked={flippedValue}
			/>
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
		<button
			on:click={() => {
				if (currentImage) {
					pitchCorrection = currentImage.pitchCorrection;
				}
			}}
			type="button"
			class="btn btn-secondary">Reset</button
		>
		<button type="button" class="btn btn-secondary">View from Side</button>
		<button type="button" class="btn btn-primary">Set Pitch</button>

		<hr />

		<h4 class="mt-3">Image Options</h4>
		<label for="image_id">Image Id</label>
		<input id="image_id" readonly class="form-control" value={currentImage?.id ?? 'Undefined'} />
		<div class="mt-2 form-check form-switch">
			<input
				checked={(() => {
					return currentImage?.visibility ?? false;
				})()}
				id="image_public_switch"
				class="form-check-input"
				type="checkbox"
				role="switch"
			/>
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
