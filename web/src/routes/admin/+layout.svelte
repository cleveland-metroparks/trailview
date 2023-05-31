<script lang="ts">
	import { goto } from '$app/navigation';
	import { mainHeading } from './stores';
</script>

<div style="position:relative">
	<h1 class="mt-3" style="text-align:center">{$mainHeading}</h1>
	<button
		on:click={async () => {
			const res = await fetch('/logout', { method: 'POST' });
			const data = await res.json();
			if (data.success === true) {
				goto('/login');
			}
		}}
		style="position:absolute; bottom:0; right: 0"
		type="button"
		class="btn btn-secondary">Logout</button
	>
</div>

<hr />

<slot />
