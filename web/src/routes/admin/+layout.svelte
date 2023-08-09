<script lang="ts">
	import 'bootstrap/dist/css/bootstrap.min.css';
	import 'bootstrap-icons/font/bootstrap-icons.min.css';
	import { onMount } from 'svelte';
	import Header from './Header.svelte';
	onMount(async () => {
		await import('bootstrap');
	});
</script>

<div class="d-flex flex-column h-100 overflow-hidden">
	<Header />
	<slot />
</div>

<style lang="scss">
	:global(html, body) {
		height: 100%;
		margin: 0;
	}
</style>
