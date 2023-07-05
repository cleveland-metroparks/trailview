<script lang="ts">
	import type {
		TrailViewerBase,
		TrailViewerBaseOptions
	} from '@cmparks/trailviewer/dist/trailviewer-base';
	import '@cmparks/trailviewer/dist/trailviewer-base.css';
	import { sequence } from '@sveltejs/kit/hooks';
	import { onDestroy, onMount } from 'svelte';
	import { z } from 'zod';

	const flutterTrailViewerBaseOptionsType = z.object({
		initialImageId: z.string().optional().nullable(),
		initialLatLng: z
			.object({
				latitude: z.number(),
				longitude: z.number()
			})
			.optional()
			.nullable(),
		baseUrl: z.string(),
		imageFetchType: z.enum(['standard', 'all']),
		filterSequences: z.array(z.number()).optional().nullable()
	});

	let trailviewerOptions: TrailViewerBaseOptions | undefined;
	let trailviewer: TrailViewerBase | undefined;

	onMount(async () => {
		const trailview = await import('@cmparks/trailviewer/dist/trailviewer-base');
		window.addEventListener('message', (message: MessageEvent<string>) => {
			const messageData = JSON.parse(message.data) as { type: string; data: unknown };
			if (messageData.type === 'options') {
				const flutterOptions = flutterTrailViewerBaseOptionsType.safeParse(messageData.data);
				if (!flutterOptions.success) {
					console.error(`Invalid options type: ${flutterOptions.error}`);
					return;
				}
				const o = flutterOptions.data;
				const options = trailview.defaultBaseOptions;
				if (o.initialLatLng !== undefined && o.initialLatLng !== null) {
					options.initial = {
						latitude: o.initialLatLng.latitude,
						longitude: o.initialLatLng.longitude
					};
				} else if (o.initialImageId !== undefined && o.initialImageId !== null) {
					options.initial = o.initialImageId;
				} else {
					console.error('No initial specified (neither image id nor location)');
					return;
				}
				options.baseUrl = o.baseUrl;
				options.navArrowMinAngle = -25;
				options.navArrowMaxAngle = -20;
				options.imageFetchType = o.imageFetchType;
				if (o.filterSequences !== undefined && o.filterSequences !== null) {
					options.filterSequences = o.filterSequences;
				}
				options.target = 'trailviewer';
				trailviewerOptions = options;
				messageHandler?.postMessage(JSON.stringify({ type: 'optionsSet' }));
			} else if (
				messageData.type === 'start' &&
				trailviewerOptions !== undefined &&
				trailviewer === undefined
			) {
				trailviewer = new trailview.TrailViewerBase(trailviewerOptions);
				trailviewer.on('init-done', () => {
					messageHandler?.postMessage(
						JSON.stringify({
							type: 'onInitDone'
						})
					);
				});
				trailviewer.on('image-change', (image) => {
					messageHandler?.postMessage(
						JSON.stringify({
							type: 'onImageChange',
							data: {
								id: image.id,
								sequenceId: image.sequenceId,
								latitude: image.latitude,
								longitude: image.longitude,
								bearing: image.bearing,
								flipped: image.flipped,
								pitchCorrection: image.pitchCorrection,
								visibility: image.visibility,
								shtHash: image.shtHash ?? null
							}
						})
					);
				});
				messageHandler?.postMessage('started');
			} else if (messageData.type === 'destroy' && trailviewer !== undefined) {
				trailviewer.destroy();
				trailviewer = undefined;
			} else if (messageData.type === 'goToImageId' && trailviewer !== undefined) {
				trailviewer.goToImageID(messageData.data as string);
			} else if (messageData.type === 'getBearing') {
				if (trailviewer === undefined) {
					messageHandler?.postMessage(JSON.stringify({ type: 'bearingGet', data: null }));
					return;
				}
				const bearing = trailviewer.getBearing();
				messageHandler?.postMessage(JSON.stringify({ type: 'bearingGet', data: bearing ?? null }));
			} else if (messageData.type === 'getCurrentImageId') {
				if (trailviewer === undefined) {
					messageHandler?.postMessage(JSON.stringify({ type: 'currentImageIdGet', data: null }));
					return;
				}
				const currentImageId = trailviewer.getCurrentImageID();
				messageHandler?.postMessage(
					JSON.stringify({ type: 'currentImageIdGet', data: currentImageId ?? null })
				);
			} else if (messageData.type === 'getCurrentSequenceId') {
				if (trailviewer === undefined) {
					messageHandler?.postMessage(JSON.stringify({ type: 'currentSequenceIdGet', data: null }));
					return;
				}
				const currentSequenceId = trailviewer.getCurrentSequenceId();
				messageHandler?.postMessage(
					JSON.stringify({ type: 'currentSequenceIdGet', data: currentSequenceId ?? null })
				);
			} else if (messageData.type === 'getFlipped') {
				if (trailviewer === undefined) {
					messageHandler?.postMessage(JSON.stringify({ type: 'flippedGet', data: null }));
					return;
				}
				const flipped = trailviewer.getFlipped();
				messageHandler?.postMessage(JSON.stringify({ type: 'flippedGet', data: flipped ?? null }));
			} else if (messageData.type === 'getImageGeo') {
				if (trailviewer === undefined) {
					messageHandler?.postMessage(JSON.stringify({ type: 'imageGeoGet', data: null }));
					return;
				}
				const imageGeo = trailviewer.getImageGeo();
				messageHandler?.postMessage(
					JSON.stringify({ type: 'imageGeoGet', data: imageGeo ?? null })
				);
			}
		});
		if (messageHandler !== undefined) {
			messageHandler.postMessage(JSON.stringify({ type: 'init' }));
		}
	});

	onDestroy(() => {
		trailviewer?.destroy();
	});
</script>

<div id="trailviewer" />

<style>
	:global(html, body) {
		width: 100%;
		height: 100%;
		margin: 0;
	}

	:global(.trailview-nav-arrow) {
		-webkit-tap-highlight-color: transparent;
	}

	#trailviewer {
		width: 100%;
		height: 100%;
	}
</style>
