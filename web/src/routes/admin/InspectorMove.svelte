<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TrailViewer } from '$lib/trailviewer';

	export let trailviewer: TrailViewer | undefined;

	const dispatch = createEventDispatcher<{ 'should-refresh': void }>();

	let showEditSpinner = false;
</script>

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
		dispatch('should-refresh');
	}}
	type="button"
	class="btn btn-primary"
	>{#if showEditSpinner}<span class="spinner-border spinner-border-sm" />{/if}Submit Changes</button
>
