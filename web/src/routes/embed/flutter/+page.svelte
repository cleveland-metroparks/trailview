<script lang="ts">
	import type {
		TrailViewerBase,
		TrailViewerBaseOptions
	} from '@cmparks/trailviewer/dist/trailviewer-base';
	import '@cmparks/trailviewer/dist/trailviewer-base.css';
	import { onMount } from 'svelte';
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
		navArrowMinAngle: z.number(),
		navArrowMaxAngle: z.number(),
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
				options.navArrowMinAngle = o.navArrowMinAngle;
				options.navArrowMaxAngle = o.navArrowMaxAngle;
				options.imageFetchType = o.imageFetchType;
				if (o.filterSequences !== undefined && o.filterSequences !== null) {
					options.filterSequences = o.filterSequences;
				}
				options.target = 'trailviewer';
				trailviewerOptions = options;
				messageHandler?.postMessage('optionsSet');
			} else if (
				messageData.type === 'start' &&
				trailviewerOptions !== undefined &&
				trailviewer === undefined
			) {
				trailviewer = new trailview.TrailViewerBase(trailviewerOptions);
				
				messageHandler?.postMessage('started');
			}
		});
		if (messageHandler !== undefined) {
			messageHandler.postMessage('init');
		}
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
