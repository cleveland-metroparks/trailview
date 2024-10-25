<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TrailViewer } from '$lib/trailviewer';

	interface Props {
		trailviewer: TrailViewer | undefined;
	}

	let { trailviewer }: Props = $props();

	const dispatch = createEventDispatcher<{ 'should-refresh': void; 'edit-enabled': boolean }>();

	let showEditSpinner = $state(false);
	let editEnabled = $state(false);

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
			onchange={onEditCheckChange}
		/>
		<label class="form-check-label" for="editZoomCheck">Edit Mode (When zoomed)</label>
	</div>

	<button
		onclick={() => {
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
		onclick={() => {
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
		onclick={async () => {
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
			<span class="spinner-border spinner-border-sm"></span>
		{/if}
		Submit Changes
	</button>
</div>
