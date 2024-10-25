<script lang="ts">
	import FormAlert from '$lib/FormAlert.svelte';
	import { localDateTimeString } from '$lib/util';
	import type { ActionData, PageData } from './$types';
	import CreateModal from './CreateModal.svelte';
	import KeyModal from './KeyModal.svelte';
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import { enhance } from '$app/forms';
	import EditModal from './EditModal.svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let createModal: ReturnType<typeof CreateModal> | undefined = $state();
	let keyModal: ReturnType<typeof KeyModal> | undefined = $state();
	let confirmModal: ReturnType<typeof ConfirmModal> | undefined = $state();
	let editModal: ReturnType<typeof EditModal> | undefined = $state();
	$effect(() => {
		if (form && browser) {
			createModal?.hide();
			editModal?.hide();
		}
	});
</script>

<CreateModal bind:this={createModal} />
<KeyModal bind:this={keyModal} />
<ConfirmModal bind:this={confirmModal} />
<EditModal bind:this={editModal} />

<div class="container mt-3">
	<FormAlert />

	<div class="d-flex flex-row-reverse mb-3">
		<button
			onclick={() => {
				createModal?.show();
			}}
			type="button"
			class="btn btn-success">Create</button
		>
	</div>
	<div class="table-responsive">
		<table class="table table-hover table-bordered">
			<thead>
				<tr>
					<th scope="col">Id</th>
					<th scope="col">Name</th>
					<th scope="col">Role</th>
					<th scope="col">Active</th>
					<th scope="col">Created</th>
					<th scope="col">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.apiKeys as apiKey}
					<tr>
						<th scope="row">{apiKey.id}</th>
						<td>{apiKey.name}</td>
						<td><span class="badge text-bg-secondary">{apiKey.role}</span></td>
						<td>
							{#if apiKey.active}
								<span class="badge text-bg-success">Active</span>
							{:else}
								<span class="badge text-bg-danger">Inactive</span>
							{/if}
						</td>
						<td>{localDateTimeString(apiKey.createdAt)}</td>
						<td class="d-flex flex-row gap-2">
							<button
								onclick={() => {
									keyModal?.show(apiKey.key);
								}}
								type="button"
								class="btn btn-sm btn-outline-info"
								aria-label="show API key"
							>
								<i class="bi bi-key"></i>
							</button>
							<button
								onclick={() => {
									editModal?.show(apiKey.id, apiKey.name, apiKey.role, apiKey.active);
								}}
								type="button"
								class="btn btn-sm btn-outline-warning"
								aria-label="edit"
							>
								<i class="bi bi-pencil"></i>
							</button>
							<form
								class="d-inline"
								action="?/delete"
								method="POST"
								use:enhance={async ({ cancel }) => {
									cancel();
									const res = await confirmModal?.prompt(
										`Are you sure you want to delete this API key (${apiKey.name})?`,
										'Confirm Delete API Key'
									);
									if (res === false) {
										cancel();
									}
									return async ({ update }) => {
										await update();
									};
								}}
							>
								<input name="id" type="hidden" value={apiKey.id} />
								<button type="submit" class="btn btn-sm btn-danger" aria-label="delete">
									<i class="bi bi-trash3"></i>
								</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
