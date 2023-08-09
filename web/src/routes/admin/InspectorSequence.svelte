<script lang="ts">
	import { enhance } from '$app/forms';
	import { createEventDispatcher } from 'svelte';
	import { mapsApiTrailSelectValue, type MapsApiTrailsType } from './+page.svelte';
	import type { TrailViewer, Image } from '$lib/trailviewer';

	export let trailviewer: TrailViewer | undefined;
	export let currentSequence:
		| { name: string; id: number; mapsApiTrailId: number | null }
		| undefined;
	export let mapsApiTrails: MapsApiTrailsType | null = null;
	export let currentImage: Image | undefined;
	export let pitchCorrection = 0;
	export let flipped: boolean;

	const dispatch = createEventDispatcher<{
		'should-refresh': void;
	}>();

	let showSequenceSpinner = false;

	function onPitchCorrectionChange() {
		if (!trailviewer || !currentImage) {
			return;
		}
		if (trailviewer.allImageData !== undefined) {
			trailviewer.overridePitchCorrection(pitchCorrection);
		}
	}
</script>

<form
	action="?/sequence"
	method="POST"
	use:enhance={() => {
		showSequenceSpinner = true;
		return async ({ update }) => {
			await update({ reset: false });
			showSequenceSpinner = false;
			dispatch('should-refresh');
		};
	}}
>
	<label for="mapsApiTrailsSelect">Assign to Maps API Trail</label>
	{#if mapsApiTrails !== null}
		<select
			name="mapsApiTrailId"
			id="mapsApiTrailsSelect"
			class="form-select"
			value={mapsApiTrailSelectValue(mapsApiTrails, currentSequence)}
		>
			<option class="sequence-option" value="unassigned">Unassigned</option>
			{#each mapsApiTrails as trail}
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
			bind:value={flipped}
			id="flip_switch"
			name="flip"
			class="form-check-input"
			type="checkbox"
			role="switch"
			bind:checked={flipped}
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
			dispatch('should-refresh');
		}}
		type="button"
		class="btn btn-secondary">Reset</button
	>
	<button
		on:click={() => {
			trailviewer?.getPanViewer()?.lookAt(0, 90, 120, false);
		}}
		type="button"
		class="btn btn-secondary">View from Side</button
	>
	<br />
	<hr />
	<div class="d-flex flex-row justify-content-center">
		<button type="submit" class="btn btn-primary"
			>{#if showSequenceSpinner}<span class="spinner-border spinner-border-sm" />{/if} Set</button
		>
	</div>
</form>
