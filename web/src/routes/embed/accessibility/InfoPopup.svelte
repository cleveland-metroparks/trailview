<script lang="ts">
	import { fly } from 'svelte/transition';
	import imgClose from '$lib/assets/icons/close.svg';

	let shown = true;

	function hide() {
		shown = false;
	}
</script>

{#if shown}
	<div transition:fly={{ x: -100, duration: 500 }} class="info-popup">
		<button on:click={hide} type="button" class="green-button close-button"
			><img src={imgClose} alt="close icon" /></button
		>
		Click/Tap on the green highlight on the map to navigate
	</div>
{/if}

<style lang="scss">
	.info-popup {
		font-family: 'Myriad Pro Condensed';
		font-size: 18px;
		position: absolute;
		z-index: 11;
		left: 8px;
		top: 8px;
		background-color: rgba(214, 214, 214, 0.97);
		border-radius: 10px;
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.3);
		width: 200px;
		text-align: center;
		padding-top: 10px;
		padding-bottom: 10px;
		padding-left: 10px;
		padding-right: 10px;
		user-select: none;
	}

	.green-button {
		position: relative;
		border: none;
		border-radius: 50%;
		width: 30px;
		height: 30px;
		background-color: rgb(106, 176, 62);
		box-shadow:
			rgba(50, 50, 93, 0.25) 0px 2px 5px -1px,
			rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;

		transition: background-color 0.2s;
		&:hover {
			background-color: rgb(29, 92, 30);
			cursor: pointer;
		}

		img {
			position: absolute;
			top: 50%;
			left: 50%;
			width: 33px;
			height: 33px;
			transform: translate(-50%, -50%);
		}
	}

	.close-button {
		float: left;
		margin-right: 10px;
	}
</style>
