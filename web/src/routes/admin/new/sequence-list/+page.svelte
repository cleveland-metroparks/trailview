<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import type { Sequence } from '@prisma/client';

	export let data: PageData;

	let showDone = true;
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

	async function onDelete(sequence: Sequence) {
		const response = prompt(
			`Are you sure you want to delete ${sequence.name}? Type 'I understand' to confirm deletion.`
		);
		if (response !== null && response === 'I understand') {
			const res = await fetch(`/admin/delete/${sequence.id}`, { method: 'DELETE' });
			const resData = await res.json();
			if (resData.success !== true) {
				alert(resData.message ?? 'Unknown error while deleting');
			} else {
				alert('Marked for deletion');
				await invalidateAll();
			}
		}
	}

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

<svelte:head>
	<title>Sequence List</title>
</svelte:head>

<div class="px-2">
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
				<th>Actions</th>
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
					<td>
						{#if sequence.toDelete === false}
							<form
								on:submit|preventDefault={() => {
									onDelete(sequence);
								}}
								method="POST"
							>
								<button type="submit" class="btn btn-sm btn-danger">Delete</button>
							</form>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.status-text {
		font-size: 18px;
	}
</style>
