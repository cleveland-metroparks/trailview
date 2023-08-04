<script lang="ts">
	import { goto } from '$app/navigation';
	import { mainHeading } from './stores';
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
	<div style="position:relative">
		<a style="position:absolute; bottom:0; left:0" href="/admin" class="btn btn-outline-primary"
			>Home</a
		>
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
</div>
