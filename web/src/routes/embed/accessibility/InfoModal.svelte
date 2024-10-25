<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import type { AccessibleTrailName } from './InfoContent.svelte';
	import InfoContent from './InfoContent.svelte';
	import imgClose from '$lib/assets/icons/close.svg';
	import imgInfo from '$lib/assets/icons/info.svg';

	interface Props {
		trail: AccessibleTrailName;
	}

	let { trail = $bindable() }: Props = $props();

	let visible = $state(false);
	export function show() {
		visible = true;
	}

	export function hide() {
		visible = false;
	}
</script>

{#if visible}
	<div transition:fly={{ x: 100, duration: 500 }} class="modal">
		<button onclick={hide} type="button" class="green-button close-button"
			><img src={imgClose} alt="close icon" /></button
		>
		{#key trail}
			<div in:fly|global={{ x: 100, duration: 500 }}>
				<h2 class="title">{trail}</h2>
				<hr />
				<div class="body">
					<!-- eslint-disable -->
					<InfoContent selectedTrail={trail} />
				</div>
			</div>
		{/key}
	</div>
{:else}
	<button onclick={show} in:scale={{ delay: 200 }} out:scale class="green-button info-button"
		><img src={imgInfo} alt="open info icon" /></button
	>
{/if}

<style lang="scss">
	hr {
		border: 1px solid rgb(149, 154, 156);
	}

	.body {
		font-family: 'Myriad Pro';
		padding-bottom: 30px;

		:global(img) {
			display: block;
			text-align: center;
			margin-left: auto;
			margin-right: auto;
			width: 80%;
			outline: 4px solid rgb(29, 92, 30);
			transform: scale(1);

			transition: transform 0.5s;
			&:hover {
				transform: scale(1.02);
			}
		}
	}

	.modal {
		position: absolute;
		right: 8px;
		top: 8px;
		bottom: 8px;
		width: 380px;
		z-index: 11;
		background-color: rgba(214, 214, 214, 0.97);
		border-radius: 10px;
		box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.3);
		padding-left: 20px;
		padding-right: 10px;
		overflow-y: auto;
		overflow-x: hidden;

		@media screen and (max-width: 600px) {
			width: auto;
			left: 8px;
		}
	}

	.title {
		font-family: 'Myriad Pro Condensed';
		font-size: 32px;
		margin-bottom: 14px;
		margin-top: 16px;
		margin-right: 50px;
	}

	.green-button {
		position: absolute;
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
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
			width: 44px;
			height: 44px;
			transform: translate(-50%, -50%);
		}
	}

	.close-button {
		top: 14px;
		right: 10px;
	}

	.info-button {
		top: 14px;
		right: 10px;
		z-index: 12;
		box-shadow:
			rgba(0, 0, 0, 0.3) 0px 19px 38px,
			rgba(0, 0, 0, 0.22) 0px 15px 12px;

		img {
			width: 40px;
			height: 40px;
		}
	}
</style>
