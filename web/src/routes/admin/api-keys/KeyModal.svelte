<script lang="ts">
	import Modal from '$lib/Modal.svelte';

	export function show(apiKey: string) {
		key = apiKey;
		modal?.show();
	}

	export function hide() {
		key = null;
		modal?.hide();
	}

	let key: string | null = $state(null);

	let modal: ReturnType<typeof Modal> | undefined = $state();
</script>

<Modal bind:this={modal} title="API Key">
	<div class="modal-body">
		<label for="keyField" class="form-label">Key</label>
		<input id="keyField" type="text" class="form-control" value={key} />
	</div>
	<div class="modal-footer">
		<button
			onclick={() => {
				modal?.hide();
			}}
			type="button"
			class="btn btn-secondary">Close</button
		>
	</div>
</Modal>
