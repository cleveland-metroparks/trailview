<script lang="ts">
	import { page } from '$app/stores';
	import { afterUpdate } from 'svelte';
	import { slide } from 'svelte/transition';

	let dismissed = false;
	let success = false;

	$: if ($page.form) {
		dismissed = false;
	}

	afterUpdate(() => {
		if ($page.form) {
			success = $page.form.success;
		}
	});
</script>

{#if $page.form && dismissed === false}
	<div
		transition:slide|local
		class={`mt-2 mb-2 alert alert-dismissible alert-${success ? 'success' : 'danger'}`}
	>
		{success ? 'Success' : $page.form.message ?? 'Unknown error'}
		<button
			on:click={() => {
				dismissed = true;
			}}
			type="button"
			class="btn-close"
		/>
	</div>
{/if}
