<script lang="ts">
	import '$lib/trailviewer.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import type { Image, TrailViewer } from '$lib/trailviewer';
	import { onDestroy, onMount } from 'svelte';
	import type { PageData } from './$types';
	import urlJoin from 'url-join';
	import { z } from 'zod';
	import { closestIntersection, degreeToVector, type Line2 } from './icp';
	import type { MultiLineString } from 'geojson';
	import type { GeoJSONSource } from 'mapbox-gl';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let listenForEdits = true;

	let trailviewer: TrailViewer | undefined;
	async function createTrailViewer() {
		const trailview = await import('$lib/trailviewer');
		let trailviewerOptions = trailview.defaultOptions;

		trailviewerOptions.baseUrl = $page.url.origin;
		trailviewerOptions.mapboxKey = env.PUBLIC_TV_MAPBOX_KEY;
		trailviewerOptions.fetchPrivate = true;
		trailviewerOptions.initialImageId =
			$page.url.searchParams.get('i') ?? 'c96ba6029cad464e9a4b7f9a6b8ac0d5';
		trailviewer = new trailview.TrailViewer();
		trailviewer.on('image-change', (image: Image) => {
			if ($page.url.searchParams.get('i') !== image.id) {
				const newUrl = $page.url;
				newUrl.searchParams.set('i', image.id);
				goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
			}
		});
		trailviewer.on('edit', () => {
			if (listenForEdits === true) {
				updateEditLines();
			}
		});
	}

	onMount(async () => {
		await createTrailViewer();
	});

	onDestroy(() => {
		trailviewer?.destroy();
	});

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

	let currentDrawnTrail: string | undefined;
	let currentApiTrailGeoJson: Line2[] | undefined;
	async function drawTrail() {
		if (mapsApiTrailValue === 'unassigned') {
			return;
		}
		if (env.PUBLIC_TV_MAPS_API === '') {
			return;
		}
		const res = await fetch(
			urlJoin(env.PUBLIC_TV_MAPS_API, '/trail_geometries', mapsApiTrailValue.toString())
		);
		if (res.status !== 200) {
			return;
		}
		const resData: unknown = await res.json();
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
			if (currentDrawnTrail !== undefined) {
				(trailviewer.map.getSource('mapsApiTrailSource') as GeoJSONSource).setData(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					data.data.data.geom_geojson.data as any
				);
			} else {
				trailviewer.map.addSource('mapsApiTrailSource', {
					type: 'geojson',
					data: data.data.data.geom_geojson.data
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
			currentDrawnTrail = mapsApiTrailValue.toString();

			if (data.data.data.geom_geojson.data.coordinates.length !== 0) {
				trailviewer.map.easeTo({
					center: [
						data.data.data.geom_geojson.data.coordinates[0][0][0],
						data.data.data.geom_geojson.data.coordinates[0][0][1]
					]
				});
			}
		}
	}

	let mapsApiTrailValue: number | 'unassigned' = $state('unassigned');

	let mapHasEditLayer = false;

	function updateEditLines() {
		if (
			trailviewer === undefined ||
			trailviewer.map === undefined ||
			trailviewer.allImageData === undefined
		) {
			return;
		}
		const geoJsonData: MultiLineString = {
			type: 'MultiLineString',
			coordinates: []
		};

		const updated = new Set<string>();
		for (let i = trailviewer.editList.length - 1; i >= 0; --i) {
			const edit = trailviewer.editList[i];
			if (updated.has(edit.imageId)) {
				continue;
			}
			updated.add(edit.imageId);
			const image = trailviewer.allImageData.find((im) => im.id === edit.imageId);
			if (image === undefined) {
				console.warn('Unable to find image Id');
				continue;
			}
			geoJsonData.coordinates.push([image.coordinates, [edit.new.longitude, edit.new.latitude]]);
		}

		if (mapHasEditLayer === true) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(trailviewer.map.getSource('editLinesSource') as GeoJSONSource).setData(geoJsonData as any);
		} else {
			trailviewer.map.addSource('editLinesSource', {
				type: 'geojson',
				data: geoJsonData
			});
			trailviewer.map.addLayer({
				id: 'editLines',
				type: 'line',
				source: 'editLinesSource',
				layout: {
					'line-join': 'round',
					'line-cap': 'round'
				},
				paint: {
					'line-color': '#eb4034',
					'line-width': 2
				}
			});
			mapHasEditLayer = true;
		}
	}

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
		if (mapBounds === null) {
			return;
		}
		const imagesInBounds = trailviewer.allImageData.filter((i) => {
			return mapBounds.contains(i.coordinates);
		});
		for (const image of imagesInBounds) {
			let dir = degreeToVector(image.bearing);
			dir = { x: -dir.y, y: dir.x };
			const correction = closestIntersection(
				{ x: image.coordinates[1], y: image.coordinates[0] },
				dir,
				currentApiTrailGeoJson,
				rangeLimit
			);
			listenForEdits = false;
			if (correction !== null) {
				trailviewer.pushEdit(image.id, correction.x, correction.y);
			}
			listenForEdits = true;
		}
		updateEditLines();
		trailviewer._updateEditMarkers();
	}

	function onKeyPress(event: KeyboardEvent) {
		if (event.key === 'a') {
			alignImages();
		} else if (event.key === 'z') {
			undoEdit();
		}
	}

	function undoEdit() {
		trailviewer?.undoEdit();
	}

	let rangeLimit: number = $state(10);
</script>

<svelte:window onkeypress={onKeyPress} />

<div class="row mb-5">
	<div class="col-12 col-md-9">
		<div id="viewer-container">
			<div id="trailview_panorama"></div>
		</div>
		<div id="trailview_map"></div>
	</div>
	<div class="col-12 col-md-3">
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
		<div class="row mt-2"></div>
		<h4>Actions</h4>
		<div class="flex-row d-flex gap-2 flex-wrap">
			<div class="col-auto">
				<button onclick={drawTrail} type="button" class="btn btn-primary">Draw Trail</button>
			</div>
			<div class="col-auto">
				<button onclick={alignImages} type="button" class="btn btn-warning">Align (a)</button>
			</div>
			<div class="col-auto">
				<button onclick={undoEdit} type="button" class="btn btn-warning">Undo (z)</button>
			</div>
		</div>
		<label for="limitRange" class="mt-3 form-label">Limit Align Range (meters) - {rangeLimit}</label
		>
		<input
			bind:value={rangeLimit}
			type="range"
			class="form-range"
			id="limitRange"
			min="1"
			max="50"
		/>
	</div>
</div>

<style>
	#viewer-container {
		width: 100%;
		height: 350px;
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
