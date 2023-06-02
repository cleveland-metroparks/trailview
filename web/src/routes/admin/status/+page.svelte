<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { mainHeading } from '../stores';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';

	export let data: PageData;

	$mainHeading = 'Processing Status';

	let showDone = false;
	let tableData = data.sequences;

	function statusColor(status: string) {
		switch (status) {
			case 'Done':
				return 'success';
			case 'Upload':
				return 'info';
			case 'Blur':
				return 'primary';
			case 'Tile':
				return 'warning';
			case 'Sequence':
				return 'secondary';
			default:
				return 'secondary';
		}
	}

	$: if (showDone) {
		tableData = data.sequences;
	} else {
		tableData = data.sequences.filter((sequence) => {
			return sequence.status !== 'Done' || sequence.toDelete !== false;
		});
	}

	let fetchInterval: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		fetchInterval = setInterval(async () => {
			await invalidateAll();
		}, 1000 * 10);
	});

	onDestroy(() => {
		if (fetchInterval !== undefined) {
			clearInterval(fetchInterval);
		}
	});
</script>

<a href="/admin" class="btn btn-outline-primary">Dashboard</a>

<h2 class="mt-3">Sequences</h2>
<div class="form-check form-switch">
	<input bind:checked={showDone} id="showDoneSwitch" type="checkbox" class="form-check-input" />
	<label for="showDoneSwitch">Show Done</label>
</div>
<table class="table table-bordered">
	<thead>
		<tr>
			<th>Id</th>
			<th>Name</th>
			<th>Status</th>
		</tr>
	</thead>
	<tbody>
		{#each tableData as sequence}
			<tr>
				<td>{sequence.id}</td>
				<td>{sequence.name}</td>
				{#if sequence.toDelete === false}
					<td class="status-text"
						><span class={`badge bg-${statusColor(sequence.status)}`}>{sequence.status}</span></td
					>
				{:else}
					<td class="status-text"><span class="badge bg-danger">Delete</span></td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.status-text {
		font-size: 18px;
	}
</style>
