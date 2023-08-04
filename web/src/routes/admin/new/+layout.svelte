<script lang="ts">
	import 'bootstrap/dist/css/bootstrap.min.css';
	import { onMount } from 'svelte';
	import Header from './Header.svelte';
	onMount(async () => {
		await import('bootstrap');
	});
</script>

<div class="d-flex flex-column h-100">
	<Header />
	<slot />
</div>

<style lang="scss">
	:global(html, body) {
		height: 100%;
		margin: 0;
	}
</style>
