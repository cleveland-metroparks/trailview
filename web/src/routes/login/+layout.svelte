<script lang="ts">
	import 'bootstrap/dist/css/bootstrap.min.css';
	import { onMount } from 'svelte';
	onMount(async () => {
		await import('bootstrap');
	});
</script>

<svelte:head>
	<title>TrailView Admin</title>
</svelte:head>

<div class="container">
	<slot />
</div>
