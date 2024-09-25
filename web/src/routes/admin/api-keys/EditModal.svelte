<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$lib/Modal.svelte';
	import ModalFields from './ModalFields.svelte';

	export function show(
		apiKeyId: number,
		name: string,
		role: 'standard' | 'admin',
		active: boolean
	) {
		fieldName = name;
		fieldRole = role;
		fieldActive = active;
		keyId = apiKeyId;
		modal.show();
	}

	export function hide() {
		keyId = null;
		modal.hide();
	}

	let fieldName: string | undefined;
	let fieldRole: 'standard' | 'admin' | undefined;
	let fieldActive: boolean | undefined;

	let keyId: number | null = null;
	let modal: Modal;
</script>

<Modal bind:this={modal} title="Edit API Key">
	<form
		action="?/edit"
		method="POST"
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
	>
		<div class="d-flex flex-column modal-body">
			<input type="hidden" name="id" value={keyId} />
			<ModalFields name={fieldName} role={fieldRole} active={fieldActive} />
		</div>
		<div class="modal-footer">
			<button
				on:click={() => {
					modal.hide();
				}}
				type="button"
				class="btn btn-secondary">Cancel</button
			>
			<button type="submit" class="btn btn-warning">Edit</button>
		</div>
	</form>
</Modal>
