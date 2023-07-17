<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { PUBLIC_MAPBOX_KEY } from '$env/static/public';
	import '$lib/trailviewer.css';
	import type { Actions, PageData } from './$types';
	import type { TrailViewer, Image } from '$lib/trailviewer';
	import { page } from '$app/stores';
	import { mainHeading } from './stores';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import FormAlert from '$lib/FormAlert.svelte';

	export let data: PageData;
	export let form: Actions;

	$: if (form) {
		refreshEverything();
	}

	function refreshEverything() {
		if (trailviewer !== undefined) {
			trailviewer.destroy();
			createTrailViewer();
			trailviewer.fetchAllImageData();
		}
	}

	$mainHeading = 'TrailView Admin';

	let trailviewer: TrailViewer | undefined;

	let currentSequence: { name: string; id: number; mapsApiTrailId: number | null } | undefined;
	let pitchCorrection = 0;
	let flippedValue: boolean;
	let currentImage: Image | undefined;

	function onSequenceSelectChange(event: Event) {
		if (trailviewer === undefined) {
			return;
		}
		if (trailviewer.allImageData !== undefined) {
			const image = trailviewer.allImageData.find((image) => {
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
		if (trailviewer.allImageData !== undefined) {
			trailviewer.overridePitchCorrection(pitchCorrection);
		}
	}

	async function createTrailViewer() {
		const trailview = await import('$lib/trailviewer');
		let trailviewerOptions = trailview.defaultOptions;

		trailviewerOptions.baseUrl = $page.url.origin;
		trailviewerOptions.mapboxKey = PUBLIC_MAPBOX_KEY;
		trailviewerOptions.imageFetchType = 'all';
		trailviewerOptions.initialImageId =
			$page.url.searchParams.get('i') ?? 'c96ba6029cad464e9a4b7f9a6b8ac0d5';
		trailviewer = new trailview.TrailViewer();
		trailviewer.on('image-change', (image: Image) => {
			if ($page.url.searchParams.get('i') !== image.id) {
				const newUrl = $page.url;
				newUrl.searchParams.set('i', image.id);
				goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
			}
			currentImage = image;
			flippedValue = image.flipped;
			pitchCorrection = image.pitchCorrection;
			const sequence = data.sequences.find((sequence) => {
				return sequence.id === image.sequenceId;
			});
			currentSequence = sequence;
		});
	}

	function handleKeypress(event: KeyboardEvent) {
		if (event.key === 'z' && trailviewer !== undefined) {
			trailviewer.undoEdit();
		}
	}

	onMount(async () => {
		await createTrailViewer();
	});

	onDestroy(() => {
		if (trailviewer) {
			trailviewer.destroy();
		}
	});

	function mapsApiTrailSelectValue(sequence: typeof currentSequence): number | 'unassigned' {
		const id = data.mapsApi.trails?.find((t) => {
			return t.id === sequence?.mapsApiTrailId;
		});
		console.log(id?.id);
		if (id !== undefined) {
			return id.id;
		} else {
			return 'unassigned';
		}
	}

	let showCacheSpinner = false;
	let showSequenceSpinner = false;
	let showImageSpinner = false;
	let showEditSpinner = false;
</script>

<svelte:window on:keypress={handleKeypress} />

<div class="row mb-5">
	<div class="col-lg-8">
		<div id="viewer-container">
			<div id="trailview_panorama" style="" />
		</div>
		<div id="trailview_map" />
	</div>
	<div class="col-lg-4">
		<FormAlert />
		<a href="/admin/import" class="btn btn-outline-success">Import</a>
		<a href="/admin/status" class="btn btn-outline-warning">Sequence List</a>
		<form
			class="mt-2"
			action="?/refresh"
			method="POST"
			use:enhance={() => {
				showCacheSpinner = true;
				return async ({ update }) => {
					await update({ reset: false });
					showCacheSpinner = false;
				};
			}}
		>
			<button class="btn btn-info"
				>{#if showCacheSpinner}<span class="spinner-border spinner-border-sm" />{/if}Refresh DB
				cache</button
			>
		</form>
		<h4 class="mt-3">Go To Sequence</h4>
		<select on:change={onSequenceSelectChange} class="form-select">
			{#each data.sequences as sequence}
				<option class="sequence-option" id={`sequence_${sequence.id}`}>{sequence.name}</option>
			{/each}
		</select>

		<h4 class="mt-3">Sequence Options</h4>
		<form
			action="?/sequence"
			method="POST"
			use:enhance={() => {
				showSequenceSpinner = true;
				return async ({ update }) => {
					await update({ reset: false });
					showSequenceSpinner = false;
				};
			}}
		>
			<label for="mapsApiTrailsSelect">Assign to Maps API Trail</label>
			{#if data.mapsApi.trails !== null}
				<select
					name="mapsApiTrailId"
					id="mapsApiTrailsSelect"
					class="form-select"
					value={mapsApiTrailSelectValue(currentSequence)}
				>
					<option class="sequence-option" value="unassigned">Unassigned</option>
					{#each data.mapsApi.trails as trail}
						<option class="sequence-option" value={trail.id}>{trail.name}</option>
					{/each}
				</select>
			{:else}
				<div class="alert alert-danger">Failed to fetch data</div>
			{/if}

			<input name="sequenceId" type="hidden" value={currentSequence?.id} />
			<label class="mt-2" for="sequence_name">Sequence Id and Name</label>
			<div class="input-group">
				<span class="input-group-text">{currentSequence?.id}</span>
				<input
					id="sequence_name"
					readonly
					class="form-control"
					value={(() => {
						return currentSequence?.name ?? 'Undefined';
					})()}
				/>
			</div>

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
					refreshEverything();
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
			<div class="row">
				<div class="col">
					<button type="submit" class="mt-2 btn btn-primary"
						>{#if showSequenceSpinner}<span class="spinner-border spinner-border-sm" />{/if} Set</button
					>
				</div>
			</div>
		</form>
		<hr />

		<h4 class="mt-3">Image Options</h4>
		<form
			action="?/image"
			method="POST"
			use:enhance={() => {
				showImageSpinner = true;
				return async ({ update }) => {
					await update({ reset: false });
					showImageSpinner = false;
				};
			}}
		>
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
			<button type="submit" class="mt-2 btn btn-primary"
				>{#if showImageSpinner}<span class="spinner-border spinner-border-sm" />{/if}Set</button
			>
		</form>
		<hr />
		<h4 class="mt-3">Image Move Options</h4>
		<button
			on:click={() => {
				if (trailviewer !== undefined) {
					trailviewer.undoEdit();
				}
			}}
			type="button"
			class="btn btn-warning">Undo Image Move (z)</button
		>
		<button
			on:click={async () => {
				showEditSpinner = true;
				await trailviewer?.submitEdits();
				showEditSpinner = false;
				refreshEverything();
			}}
			type="button"
			class="btn btn-primary"
			>{#if showEditSpinner}<span class="spinner-border spinner-border-sm" />{/if}Submit Changes</button
		>
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
		height: 500px;
		z-index: 5;
	}
</style>
