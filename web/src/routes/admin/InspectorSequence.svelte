<script lang="ts">
	import { enhance } from '$app/forms';
	import { createEventDispatcher } from 'svelte';
	import { mapsApiTrailSelectValue, type MapsApiTrailsType } from './+page.svelte';
	import type { TrailViewer, Image } from '$lib/trailviewer';

	interface Props {
		trailviewer: TrailViewer | undefined;
		currentSequence: { name: string; id: number; mapsApiTrailId: number | null } | undefined;
		mapsApiTrails?: MapsApiTrailsType | null;
		currentImage: Image | undefined;
		pitchCorrection?: number;
		flipped: boolean;
	}

	let {
		trailviewer,
		currentSequence,
		mapsApiTrails = null,
		currentImage,
		pitchCorrection = $bindable(0),
		flipped = $bindable()
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		'should-refresh': void;
	}>();

	let showSequenceSpinner = $state(false);

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
	<div class="d-flex flex-column">
		<h4>Sequence Info</h4>
		<input name="sequenceId" type="hidden" value={currentSequence?.id} />
		<label for="sequence_name">Sequence Id and Name</label>
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
		<hr />
		<h4>Sequence Options</h4>
		<span class="mb-2">Options apply to all images in sequence</span>
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
			<span class="badge bg-danger-subtle mb-2">Failed to fetch data</span>
		{/if}
		<div class="form-check form-switch">
			<input
				id="sequence_public_switch"
				class="form-check-input"
				type="checkbox"
				role="switch"
				name="isPublic"
				checked={(() => {
					return currentImage?.public ?? false;
				})()}
			/>
			<label class="form-check-label" for="sequence_public_switch">Publicly Visible</label>
		</div>
		<div class="mt-2 form-check form-switch">
			<input
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
			onchange={onPitchCorrectionChange}
			bind:value={pitchCorrection}
			name="pitch"
			type="range"
			class="form-range"
			id="pitch_range"
			min="-90"
			max="90"
			step="1"
		/>
		<div class="d-flex flex-row gap-2">
			<button
				onclick={() => {
					dispatch('should-refresh');
				}}
				type="button"
				class="btn btn-secondary btn-sm">Reset Pitch</button
			>
			<button
				onclick={() => {
					trailviewer?.getPanViewer()?.lookAt(0, 90, 120, false);
				}}
				type="button"
				class="btn btn-secondary btn-sm">View from Side</button
			>
		</div>
		<div class="mt-3 d-flex flex-row justify-content-center">
			<button type="submit" class="btn btn-primary btn-sm"
				>{#if showSequenceSpinner}<span class="spinner-border spinner-border-sm"></span>{/if} Apply Changes</button
			>
		</div>
	</div>
</form>
