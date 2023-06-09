<script lang="ts">
	import '@cmparks/trailviewer/dist/trailviewer.css';
	import { PUBLIC_MAPBOX_KEY } from '$env/static/public';
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import type { PageData } from './$types';
	import type { TrailViewer } from '@cmparks/trailviewer';
	import InfoModal, { type InfoModalOptions } from './InfoModal.svelte';

	export let data: PageData;

	let trailviewer: TrailViewer | undefined;
	onMount(async () => {
		if (data.accessibleTrails.length === 0) {
			throw new Error('No trails specified');
		}

		const trailviewerLib = await import('@cmparks/trailviewer');
		const options = trailviewerLib.defaultOptions;
		options.initial = data.accessibleTrails[0].initImgId;
		options.mapboxKey = PUBLIC_MAPBOX_KEY;
		options.target = 'viewer';
		trailviewer = new trailviewerLib.TrailViewer(options);

		onCarouselScroll();
		window.addEventListener('resize', () => {
			onCarouselScroll();
		});
	});

	let carouselContent: HTMLDivElement;

	function carouselPrev() {
		carouselContent.scrollBy({
			left: -400,
			behavior: 'smooth'
		});
	}

	function carouselNext() {
		carouselContent.scrollBy({
			left: 400,
			behavior: 'smooth'
		});
	}

	let showPrevButton = false;
	let showNextButton = false;

	function onCarouselScroll() {
		showPrevButton = carouselContent.scrollLeft !== 0;
		showNextButton =
			carouselContent.scrollLeft + carouselContent.offsetWidth + 1 < carouselContent.scrollWidth;
	}

	let infoModal: InfoModal;
	let infoModalOptions: InfoModalOptions = { title: data.accessibleTrails[0].displayName };
	let infoModalHtml: string = data.accessibleTrails[0].infoHtml;
</script>

<div class="container">
	<div class="viewer-container">
		<InfoModal bind:this={infoModal} bind:options={infoModalOptions}>
			<!-- eslint-disable -->
			{@html infoModalHtml}
		</InfoModal>
		<div class="viewer" id="viewer" />
	</div>
	<div class="carousel">
		{#if showPrevButton}
			<button
				transition:scale|local
				on:click={carouselPrev}
				type="button"
				class="carousel-button carousel-prev"
				><img src="/icons/chevron-left.svg" alt="scroll left" /></button
			>
		{/if}
		{#if showNextButton}
			<button
				transition:scale|local
				on:click={carouselNext}
				type="button"
				class="carousel-button carousel-next"
				><img src="/icons/chevron-right.svg" alt="scroll right" /></button
			>
		{/if}
		<div on:scroll={onCarouselScroll} bind:this={carouselContent} class="carousel-content">
			{#each data.accessibleTrails as trail}
				<button
					on:click={() => {
						if (trailviewer !== undefined) {
							trailviewer.goToImageID(trail.initImgId);
							infoModalOptions.title = trail.displayName;
							infoModalHtml = trail.infoHtml;
							infoModal.show();
						}
					}}
					class="carousel-item"
				>
					<span class="carousel-item-text">{trail.displayName}</span>
					<div class="carousel-outline" />
					<img src="/woodpecker_way.jpg" class="placeholder-image" alt="Woodpecker Way" />
				</button>
			{/each}
		</div>
	</div>
</div>

<style lang="scss">
	:global(body, html) {
		margin: 0;
		width: 100%;
		height: 100%;
	}

	.container {
		width: 100%;
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.carousel {
		width: 100%;
		justify-content: center;
		display: flex;
		position: relative;
		height: 140px;
		background-color: rgb(255, 255, 255);
		margin-bottom: 10px;
	}

	.carousel-content {
		align-items: center;
		display: flex;
		column-gap: 8px;
		padding-left: 10px;
		padding-right: 10px;
		padding-top: 10px;
		overflow-x: auto;

		scrollbar-width: none;
		&::-webkit-scrollbar {
			width: 0;
			height: 0;
		}
	}

	.carousel-button {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 3;
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 50%;
		background-color: rgb(106, 176, 62);
		box-shadow: rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px;

		transition: background-color 0.2s;
		&:hover {
			background-color: rgb(29, 92, 30);
			cursor: pointer;
		}

		img {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 50px;
			height: 50px;
		}
	}

	.carousel-prev {
		left: 5px;
		img {
			left: 47%;
		}
	}

	.carousel-next {
		right: 5px;
		img {
			left: 53%;
		}
	}

	.viewer-container,
	.viewer {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.carousel-item-text {
		position: absolute;
		bottom: 10px;
		left: 10px;
		font-family: 'Myriad Pro Condensed';
		z-index: 1;
		text-shadow: 3px 3px 3px rgba(35, 34, 34, 0.5);
		color: rgb(255, 255, 255);
		font-size: 24px;
	}

	.carousel-outline {
		position: absolute;
		outline: none;
		outline-offset: -4px;
		width: 100%;
		height: 100%;
		z-index: 2;
	}

	.carousel-item {
		border: none;
		padding: 0;
		position: relative;
		background-color: gray;
		min-width: 240px;
		height: 120px;
		overflow: hidden;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			transform: scale(1);
			transition: transform 0.5s;
		}

		&:hover {
			cursor: pointer;

			.carousel-outline {
				outline: 4px solid rgb(29, 92, 30);
			}
			img {
				transform: scale(1.1);
			}
		}
	}
</style>
