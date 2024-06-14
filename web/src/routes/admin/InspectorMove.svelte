<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TrailViewer } from '$lib/trailviewer';

	export let trailviewer: TrailViewer | undefined;

	const dispatch = createEventDispatcher<{ 'should-refresh': void; 'edit-enabled': boolean }>();

	let showEditSpinner = false;
	let editEnabled = false;

	function onEditCheckChange() {
		dispatch('edit-enabled', editEnabled);
	}
</script>

<div class="d-flex flex-column gap-2">
	<div class="form-check">
		<input
			bind:checked={editEnabled}
			class="form-check-input"
			type="checkbox"
			id="editZoomCheck"
			on:change={onEditCheckChange}
		/>
		<label class="form-check-label" for="editZoomCheck">Edit Mode (When zoomed)</label>
	</div>

	<button
		on:click={() => {
			if (trailviewer !== undefined) {
				trailviewer.undoEdit();
			}
		}}
		type="button"
		class="btn btn-warning"
		disabled={!editEnabled}
	>
		Undo Image Move (z)
	</button>
	<button
		on:click={() => {
			if (trailviewer !== undefined) {
				trailviewer.discardEdits();
			}
		}}
		type="button"
		class="btn btn-danger"
		disabled={!editEnabled}
	>
		Discard Edits
	</button>

	<button
		on:click={async () => {
			showEditSpinner = true;
			await trailviewer?.submitEdits();
			showEditSpinner = false;
			dispatch('should-refresh');
		}}
		type="button"
		class="btn btn-primary"
		disabled={!editEnabled}
	>
		{#if showEditSpinner}
			<span class="spinner-border spinner-border-sm" />
		{/if}
		Submit Changes
	</button>
</div>
