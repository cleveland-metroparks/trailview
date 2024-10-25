<script lang="ts">
	import Header from './Header.svelte';
	import { onMount } from 'svelte';
	import 'bootstrap/dist/css/bootstrap.min.css';
	import 'bootstrap-icons/font/bootstrap-icons.min.css';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
	onMount(async () => {
		await import('bootstrap');
	});
</script>

<div class="d-flex flex-column h-100 overflow-hidden">
	<Header />
	{@render children?.()}
</div>

<style lang="scss">
	:global(html, body) {
		height: 100%;
		margin: 0;
	}
</style>
