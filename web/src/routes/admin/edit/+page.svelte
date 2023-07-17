<script lang="ts">
	import '$lib/trailviewer.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { PUBLIC_MAPBOX_KEY, PUBLIC_MAPS_API } from '$env/static/public';
	import type { Image, TrailViewer } from '$lib/trailviewer';
	import { onDestroy, onMount } from 'svelte';
	import type { PageData } from './$types';
	import urlJoin from 'url-join';
	import { z } from 'zod';
	import { closestIntersection, degreeToVector, type Line2, type Vec2 } from './icp';

	export let data: PageData;

	let currentSequence: { name: string; id: number; mapsApiTrailId: number | null } | undefined;
	let pitchCorrection = 0;
	let flippedValue: boolean;
	let currentImage: Image | undefined;

	let trailviewer: TrailViewer | undefined;
	async function createTrailViewer() {
		const trailview = await import('$lib/trailviewer');
		let trailviewerOptions = trailview.defaultOptions;

		trailviewerOptions.baseUrl = $page.url.origin;
		trailviewerOptions.mapboxKey = PUBLIC_MAPBOX_KEY;
		trailviewerOptions.imageFetchType = 'all';
		trailviewerOptions.initialImageId =
			$page.url.searchParams.get('i') ?? 'c96ba6029cad464e9a4b7f9a6b8ac0d5';
		trailviewer = new trailview.TrailViewer();
		trailviewer.on('image-change', (image: Image) => {
			if ($page.url.searchParams.get('i') !== image.id) {
				const newUrl = $page.url;
				newUrl.searchParams.set('i', image.id);
				goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
			}
			currentImage = image;
			flippedValue = image.flipped;
			pitchCorrection = image.pitchCorrection;
			const sequence = data.sequences.find((sequence) => {
				return sequence.id === image.sequenceId;
			});
			currentSequence = sequence;
		});
	}

	onMount(async () => {
		await createTrailViewer();
	});

	onDestroy(() => {
		trailviewer?.destroy();
	});

	function mapsApiTrailSelectValue(sequence: typeof currentSequence): number | 'unassigned' {
		const id = data.mapsApi.trails?.find((t) => {
			return t.id === sequence?.mapsApiTrailId;
		});
		if (id !== undefined) {
			return id.id;
		} else {
			return 'unassigned';
		}
	}

	const mapsApiTrailGeometryRes = z.union([
		z.object({
			success: z.literal(false),
			message: z.string()
		}),
		z.object({
			success: z.literal(true),
			data: z.object({
				id: z.number().int(),
				geom_geojson: z.string().transform((s) => {
					const geoJsonType = z.object({
						type: z.literal('MultiLineString'),
						coordinates: z.array(z.array(z.array(z.number()).length(2)))
					});
					return geoJsonType.safeParse(JSON.parse(s));
				})
			})
		})
	]);

	let currentApiTrailGeoJson: Line2[] | undefined;
	async function drawTrail() {
		if (mapsApiTrailValue === 'unassigned') {
			return;
		}
		const res = await fetch(
			urlJoin(PUBLIC_MAPS_API, '/trail_geometries', mapsApiTrailValue.toString())
		);
		if (res.status !== 200) {
			return;
		}
		const resData: unknown = await res.json();
		console.log(resData);
		const data = mapsApiTrailGeometryRes.safeParse(resData);
		if (data.success !== true) {
			console.error(data.error.message);
			return;
		}
		if (data.data.success !== true) {
			console.error(data.data.message);
			return;
		}
		if (data.data.data.geom_geojson.success !== true) {
			console.error(`Unexpected geojson data: ${data.data.data.geom_geojson.error.message}`);
			return;
		}
		currentApiTrailGeoJson = [];
		for (const segment of data.data.data.geom_geojson.data.coordinates) {
			for (let i = 1; i < segment.length; i++) {
				const p1 = segment[i - 1];
				const p2 = segment[i];
				currentApiTrailGeoJson.push({ p1: { x: p1[1], y: p1[0] }, p2: { x: p2[1], y: p2[0] } });
			}
		}

		if (trailviewer !== undefined && trailviewer.map !== undefined) {
			trailviewer.map.addSource('mapsApiTrailSource', {
				type: 'geojson',
				data: data.data.data.geom_geojson.data as any
			});
			trailviewer.map.addLayer({
				id: 'mapsApiTrail',
				type: 'line',
				source: 'mapsApiTrailSource',
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				},
				paint: {
					'line-color': '#888',
					'line-width': 8
				}
			});
		}
	}

	let mapsApiTrailValue: number | 'unassigned' = 'unassigned';

	function alignImages() {
		if (
			trailviewer === undefined ||
			trailviewer.allImageData === undefined ||
			trailviewer.map === undefined ||
			currentApiTrailGeoJson === undefined
		) {
			return;
		}
		const mapBounds = trailviewer.map.getBounds();
		const imagesInBounds = trailviewer.allImageData.filter((i) => {
			return mapBounds.contains([i.longitude, i.latitude]);
		});
		for (const image of imagesInBounds) {
			console.log(image.bearing);
			let dir = degreeToVector(image.bearing);
			dir = { x: -dir.y, y: dir.x };
			const correction = closestIntersection(
				{ x: image.latitude, y: image.longitude },
				dir,
				currentApiTrailGeoJson
			);
			if (correction !== null) {
				trailviewer.pushEdit(image.id, correction.x, correction.y);
			}
		}
	}
</script>

<div class="row">
	<div class="col col-md-10">
		<div id="viewer-container">
			<div id="trailview_panorama" />
		</div>
		<div id="trailview_map" />
	</div>
	<div class="col col-md-2">
		<h4>Maps API Trails</h4>
		{#if data.mapsApi.trails !== null}
			<select
				name="mapsApiTrailId"
				id="mapsApiTrailsSelect"
				class="form-select"
				bind:value={mapsApiTrailValue}
			>
				<option class="sequence-option" value="unassigned">Unassigned</option>
				{#each data.mapsApi.trails as trail}
					<option class="sequence-option" value={trail.id}>{trail.name}</option>
				{/each}
			</select>
		{:else}
			<div class="alert alert-danger">Failed to fetch data</div>
		{/if}
		<div class="row mt-2" />
		<button on:click={drawTrail} type="button" class="btn btn-primary">Draw</button>
		<button on:click={alignImages} type="button" class="btn btn-warning">Align</button>
	</div>
</div>

<style>
	#viewer-container {
		width: 100%;
		height: 450px;
	}

	#trailview_panorama {
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		background-color: D6D6D6;
	}

	#trailview_map {
		width: 100%;
		height: 500px;
		z-index: 5;
	}
</style>
