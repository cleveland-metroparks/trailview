<script lang="ts">
	import AdminHeader from '$lib/AdminHeader.svelte';
	import { onMount } from 'svelte';
	import 'bootstrap/dist/css/bootstrap.min.css';
	import 'bootstrap-icons/font/bootstrap-icons.min.css';
	onMount(async () => {
		await import('bootstrap');
	});
</script>

<div class="d-flex flex-column h-100 overflow-hidden">
	<AdminHeader />
	<slot />
</div>

<style lang="scss">
	:global(html, body) {
		height: 100%;
		margin: 0;
	}
</style>
