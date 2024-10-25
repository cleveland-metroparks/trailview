<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/Modal.svelte';
	import ModalFields from './ModalFields.svelte';

	export function show() {
		modal?.show();
	}

	export function hide() {
		modal?.hide();
	}

	let modal: ReturnType<typeof Modal> | undefined = $state();
</script>

<Modal bind:this={modal} title="Create API Key">
	<form
		action="?/create"
		method="POST"
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
	>
		<div class="d-flex flex-column modal-body">
			<ModalFields />
		</div>
		<div class="modal-footer">
			<button
				onclick={() => {
					modal?.hide();
				}}
				type="button"
				class="btn btn-secondary">Cancel</button
			>
			<button type="submit" class="btn btn-success">Create</button>
		</div>
	</form>
</Modal>
