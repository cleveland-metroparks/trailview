<script>
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { children } = $props();
</script>

{@render children?.()}

<style>
	@font-face {
		font-family: 'Myriad Pro Condensed';
		src: url('$lib/assets/fonts/myriad-pro-condensed-700bold.woff2') format('woff2');
		font-weight: 700;
		font-style: bold;
		font-display: swap;
	}

	@font-face {
		font-family: 'Myriad Pro';
		src: url('$lib/assets/fonts/myriad-pro-400regular.woff2') format('woff2');
		font-weight: 400;
		font-style: normal;
		font-display: swap;
		letter-spacing: 0.2px;
	}
</style>
