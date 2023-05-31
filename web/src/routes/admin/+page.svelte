<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { PUBLIC_MAPBOX_KEY } from '$env/static/public';
	import '$lib/trailviewer.css';
	import { goto } from '$app/navigation';
	import type { Actions, PageData } from './$types';
	import type { TrailViewer, Image } from '$lib/trailviewer';
	import { page } from '$app/stores';

	export let data: PageData;
	export let form: Actions;

	let trailviewer: TrailViewer | undefined;

	let currentSequence: { name: string; id: number } | undefined;
	let pitchCorrection = 0;
	let flippedValue: boolean;
	let currentImage: Image | undefined;
	let originalPitchCorrections: Map<string, number> = new Map();
	let allImageData:
		| {
				id: string;
				pitchCorrection: number;
				bearing: number;
				longitude: number;
				latitude: number;
				flipped: boolean;
				visibility: boolean;
				sequenceId: number;
		  }[]
		| undefined;

	function onSequenceSelectChange(event: Event) {
		if (trailviewer === undefined) {
			return;
		}
		if (allImageData !== undefined) {
			const image = allImageData.find((image) => {
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
	}

	function onPitchCorrectionChange() {
		if (!trailviewer || !currentImage) {
			return;
		}
		if (allImageData !== undefined) {
			trailviewer.overridePitchCorrection(pitchCorrection);
		}
	}

	onMount(async () => {
		const trailview = await import('$lib/trailviewer');
		let trailviewerOptions = trailview.defaultOptions;

		trailviewerOptions.baseUrl = $page.url.origin;
		trailviewerOptions.mapboxKey = PUBLIC_MAPBOX_KEY;
		trailviewerOptions.imageFetchType = 'all';
		trailviewerOptions.initialImageId = 'c96ba6029cad464e9a4b7f9a6b8ac0d5';
		trailviewer = new trailview.TrailViewer();
		trailviewer.on('image-change', (image: Image) => {
			currentImage = image;
			flippedValue = image.flipped;
			pitchCorrection = image.pitchCorrection;
			const sequence = data.sequences.find((sequence) => {
				return sequence.id === image.sequenceId;
			});
			currentSequence = sequence;
		});

		const res = await fetch('/api/images/all', { method: 'GET' });
		const imagesData = await res.json();
		if (imagesData.success !== true) {
			throw new Error('Unable to fetch all image data');
		}
		allImageData = imagesData.data;
	});

	onDestroy(() => {
		if (trailviewer) {
			trailviewer.destroy();
		}
	});
</script>

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
		{#if form}
			<div class={`alert alert-dismissible alert-${form.success ? 'success' : 'danger'}`}>
				{form.success ? 'Success' : form.message ?? 'Unknown error'}
				<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" />
			</div>
		{/if}
		<h4 class="mt-3">Go To Sequence</h4>
		<select on:change={onSequenceSelectChange} class="form-select">
			{#each data.sequences as sequence}
				<option class="sequence-option" id={`sequence_${sequence.id}`}>{sequence.name}</option>
			{/each}
		</select>
		<h4 class="mt-3">Sequence Options</h4>
		<form action="?/sequence" method="POST">
			<input name="sequenceId" type="hidden" value={currentSequence?.id} />
			<label for="sequence_name">Sequence Name</label>
			<input
				id="sequence_name"
				readonly
				class="form-control"
				value={(() => {
					return currentSequence?.name ?? 'Undefined';
				})()}
			/>
			<div class="mt-2 form-check form-switch">
				<input
					id="sequence_public_switch"
					class="form-check-input"
					type="checkbox"
					role="switch"
					name="isPublic"
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
					name="flip"
					class="form-check-input"
					type="checkbox"
					role="switch"
					bind:checked={flippedValue}
				/>
				<label class="form-check-label" for="flip_switch">Flip 180&deg;</label>
			</div>
			<label for="pitch_range" class="mt-2 form-label">Pitch Correction: {pitchCorrection}</label>
			<input
				on:change={onPitchCorrectionChange}
				bind:value={pitchCorrection}
				name="pitch"
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
						const original = originalPitchCorrections.get(currentImage.id);
						if (original !== undefined) {
							pitchCorrection = original;
							onPitchCorrectionChange();
						}
					}
				}}
				type="button"
				class="btn btn-secondary">Reset</button
			>
			<button
				on:click={() => {
					if (trailviewer) {
						trailviewer.getPanViewer()?.lookAt(0, 90, 120, false);
					}
				}}
				type="button"
				class="btn btn-secondary">View from Side</button
			>
			<br />
			<button type="submit" class="mt-2 btn btn-primary">Set</button>
		</form>
		<hr />

		<h4 class="mt-3">Image Options</h4>
		<form action="?/image" method="POST">
			<input name="imageId" type="hidden" value={currentImage?.id} />
			<label for="image_id">Image Id</label>
			<input id="image_id" readonly class="form-control" value={currentImage?.id ?? 'Undefined'} />
			<div class="mt-2 form-check form-switch">
				<input
					checked={(() => {
						return currentImage?.visibility ?? false;
					})()}
					name="public"
					id="image_public_switch"
					class="form-check-input"
					type="checkbox"
					role="switch"
				/>
				<label class="form-check-label" for="image_public_switch">Publicly Visible</label>
			</div>
			<button type="submit" class="mt-2 btn btn-primary">Set</button>
		</form>
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
