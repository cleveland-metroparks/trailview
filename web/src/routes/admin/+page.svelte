<script module lang="ts">
	export type MapsApiTrailsType = {
		id: number;
		name: string;
		description: string | null;
	}[];

	export function mapsApiTrailSelectValue(
		trails: MapsApiTrailsType,
		sequence: { name: string; id: number; mapsApiTrailId: number | null } | undefined
	): number | 'unassigned' {
		const id = trails.find((t) => {
			return t.id === sequence?.mapsApiTrailId;
		});
		if (id !== undefined) {
			return id.id;
		} else {
			return 'unassigned';
		}
	}
</script>

<script lang="ts">
	import '$lib/trailviewer.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { onDestroy, onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import FormAlert from '$lib/FormAlert.svelte';
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import InspectorSequence from './InspectorSequence.svelte';
	import InspectorImage from './InspectorImage.svelte';
	import InspectorGroup from './InspectorGroup.svelte';
	import InspectorMove from './InspectorMove.svelte';
	import type { TrailViewer, Image } from '$lib/trailviewer';
	import type { PageData } from './$types';
	import type { GetResType as GroupGetResType } from '$api/group/[groupId]/+server';
	import type { FeatureCollection } from 'geojson';
	import type { GeoJSONSource } from 'mapbox-gl';
	import { scale, slide } from 'svelte/transition';
	import type { GetResType as SequenceImageIdsGetResType } from '$api/sequences/[sequenceId]/image-ids/+server';
	import type { GetResType as SequenceImageCoordinatesGetResType } from '$api/sequences/[sequenceId]/image-coordinates/+server';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let selectedGroupId: number | undefined = $state(undefined);

	let inspectorPages = ['Sequence', 'Image(s)', 'Group', 'Move'] as const;
	let inspectorPage: (typeof inspectorPages)[number] = $state('Sequence');

	let currentSequence: { name: string; id: number; mapsApiTrailId: number | null } | undefined =
		$state();
	let pitchCorrection = $state(0);
	let flipped: boolean = $state(false);
	let currentImage: Image | undefined = $state();

	let trailviewer: TrailViewer | undefined = $state();

	let goToSequenceSelect: HTMLSelectElement | undefined = $state();

	let confirmModal: ReturnType<typeof ConfirmModal> | undefined = $state();
	let formAlert: FormAlert | undefined = $state();

	let showCacheSpinner = $state(false);

	let highlightedSequenceId: number | undefined = $state(undefined);

	let layout: 'viewer' | 'map' = $state('map');

	$effect(() => {
		if (layout) {
			// This defers the map resize until the layout
			// changes after current event loop
			setTimeout(() => {
				trailviewer?.map?.resize();
				trailviewer?.centerMarker();
			}, 0);
		}
	});

	onMount(async () => {
		await createTrailViewer();
	});

	onDestroy(() => {
		trailviewer?.destroy();
	});

	function handleKeypress(event: KeyboardEvent) {
		if (event.key === 'z' && trailviewer !== undefined) {
			trailviewer.undoEdit();
		}
	}

	async function refreshEverything() {
		if (trailviewer !== undefined) {
			trailviewer.destroy();
			await createTrailViewer();
			await trailviewer.fetchAllImageData();
		}
	}

	async function onGoToGroupChange(event: Event) {
		const groupSelect = event.target as HTMLSelectElement;
		const selectValue = groupSelect.value;
		groupSelect.value = 'select';
		if (selectValue.startsWith('group_')) {
			const groupId = parseInt(selectValue.split('_')[1]);
			selectedGroupId = groupId;
			await goToGroup(groupId);
			await highlightGroup(groupId);
		}
	}

	async function goToGroup(groupId: number) {
		const res = await fetch(`/api/group/${groupId}?private`, { method: 'GET' });
		const resData = (await res.json()) as GroupGetResType;
		if (resData.success === true) {
			const image = resData.data.images.at(0);
			if (image !== undefined) {
				trailviewer?.goToImageID(image.id);
				if (inspectorPage !== 'Group') {
					inspectorPage = 'Group';
				}
			}
		}
	}

	async function highlightGroup(groupId: number) {
		if (
			trailviewer === undefined ||
			trailviewer.allImageData === undefined ||
			trailviewer.map === undefined
		) {
			return;
		}
		const res = await fetch(`/api/group/${groupId}?private`, { method: 'GET' });
		const resData = (await res.json()) as GroupGetResType;
		if (resData.success === false) {
			formAlert?.popup(resData);
			return;
		}
		const images = trailviewer.allImageData.filter((i) => {
			return resData.data.images.some((j) => i.id === j.id);
		});
		const geoJsonData: FeatureCollection = {
			type: 'FeatureCollection',
			features: images.map((i) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: i.coordinates
					},
					properties: {}
				};
			})
		};

		if (trailviewer.map.getLayer('groupLayer') === undefined) {
			trailviewer.map.addSource('groupSource', {
				type: 'geojson',
				data: geoJsonData
			});
			trailviewer.map.addLayer({
				id: 'groupLayer',
				source: 'groupSource',
				type: 'circle',
				paint: {
					'circle-radius': 12,
					'circle-color': 'rgb(198,3,252)'
				}
			});
			trailviewer.map.setPaintProperty('groupLayer', 'circle-radius', [
				'interpolate',

				['exponential', 0.5],
				['zoom'],
				13,
				5,

				16,
				7,

				17,
				15
			]);
			trailviewer.map.setPaintProperty('groupLayer', 'circle-opacity', [
				'interpolate',

				['exponential', 0.5],
				['zoom'],

				17,
				0.2,

				18,
				1
			]);
		} else {
			(trailviewer.map.getSource('groupSource') as GeoJSONSource).setData(geoJsonData);
		}
		goToGroup(groupId);
	}

	function removeGroupHighlight() {
		trailviewer?.map?.removeLayer('groupLayer');
		trailviewer?.map?.removeSource('groupSource');
		selectedGroupId = undefined;
	}

	async function onSequenceSelectChange(event: Event) {
		if (trailviewer === undefined) {
			console.error('Failed to select sequence, trailviewer is undefined');
			return;
		}
		const sequenceId = parseInt((event.target as HTMLSelectElement).value);
		if (isNaN(sequenceId)) {
			console.error('Failed to select sequence, sequenceId is NaN');
			return;
		}
		const res = await fetch(`/api/sequences/${sequenceId}/image-ids?private&limit=1`, {
			method: 'GET'
		});
		if (!res.ok) {
			console.error('Failed to select sequence, status =', res.status);
			return;
		}
		const resJson = (await res.json()) as SequenceImageIdsGetResType;
		if (!resJson.success) {
			console.error('Failed to select sequence, response not successful');
			return;
		}
		const imageId = resJson.data.at(0);
		if (imageId === undefined) {
			console.error('Failed to select sequence, no images');
			return;
		}
		trailviewer.goToImageID(imageId);
		inspectorPage = 'Sequence';
		if (sequenceId !== undefined) {
			highlightSequence(sequenceId);
		}
		if (goToSequenceSelect === undefined) {
			throw new Error('goToSequenceSelect undefined');
		}
		goToSequenceSelect.value = 'select';
	}

	function goToSequence(sequenceId: number) {
		if (
			trailviewer === undefined ||
			trailviewer.map === undefined ||
			trailviewer.allImageData === undefined
		) {
			return;
		}
		const image = trailviewer.allImageData.find((i) => {
			return i.sequenceId === sequenceId;
		});
		if (image !== undefined) {
			trailviewer.goToImageID(image.id);
			highlightSequence(image.sequenceId);
		}
	}

	async function highlightSequence(sequenceId: number) {
		if (trailviewer === undefined || trailviewer.map === undefined) {
			console.error('Failed to highlight sequence, trailviewer or map is undefined');
			return;
		}
		const res = await fetch(`/api/sequences/${sequenceId}/image-coordinates?private`, {
			method: 'GET'
		});
		if (!res.ok) {
			console.error('Failed to highlight sequence, status =', res.status);
			return;
		}
		const resJson = (await res.json()) as SequenceImageCoordinatesGetResType;
		if (!resJson.success) {
			console.error('Failed to highlight sequence, response unsuccessful');
			return;
		}
		const images = resJson.data;
		const geoJsonData: FeatureCollection = {
			type: 'FeatureCollection',
			features: images.map((i) => {
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: i.coordinates
					},
					properties: {}
				};
			})
		};
		if (trailviewer.map.getLayer('sequenceLayer') === undefined) {
			trailviewer.map.addSource('sequenceSource', {
				type: 'geojson',
				data: geoJsonData
			});
			trailviewer.map.addLayer({
				id: 'sequenceLayer',
				source: 'sequenceSource',
				type: 'circle',
				paint: {
					'circle-radius': 12,
					'circle-color': 'rgb(243,247,5)'
				}
			});
			trailviewer.map.setPaintProperty('sequenceLayer', 'circle-radius', [
				'interpolate',

				['exponential', 0.5],
				['zoom'],
				13,
				5,

				16,
				7,

				17,
				15
			]);
			trailviewer.map.setPaintProperty('sequenceLayer', 'circle-opacity', [
				'interpolate',

				['exponential', 0.5],
				['zoom'],

				17,
				0.2,

				18,
				1
			]);
			highlightedSequenceId = sequenceId;
		} else {
			(trailviewer.map.getSource('sequenceSource') as GeoJSONSource).setData(geoJsonData);
			highlightedSequenceId = sequenceId;
		}
	}

	async function createTrailViewer() {
		if (data.initialImageId === null) {
			return;
		}
		const trailview = await import('$lib/trailviewer');
		let trailviewerOptions = trailview.defaultOptions;

		trailviewerOptions.baseUrl = $page.url.origin;
		trailviewerOptions.mapboxKey = env.PUBLIC_TV_MAPBOX_KEY;
		trailviewerOptions.fetchPrivate = true;
		trailviewerOptions.initialImageId = $page.url.searchParams.get('i') ?? data.initialImageId;
		trailviewer = new trailview.TrailViewer();
		trailviewer.on('image-change', (image: Image) => {
			if ($page.url.searchParams.get('i') !== image.id) {
				const newUrl = $page.url;
				newUrl.searchParams.set('i', image.id);
				goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
			}
			currentImage = image;
			flipped = image.flipped;
			pitchCorrection = image.pitchCorrection;
			const sequence = data.sequences.find((sequence) => {
				return sequence.id === image.sequenceId;
			});
			currentSequence = sequence;
		});
		trailviewer.on('edit', () => {
			inspectorPage = 'Move';
		});
		trailviewer.on('edit-change', (enabled) => {
			editEnabled = enabled;
		});
		trailviewer.on('select-change', () => {
			if (trailviewer !== undefined) {
				selectedIds = [...trailviewer.selectedIds];
			} else {
				console.warn('trailviewer is undefined in selection change listener');
			}
		});
	}

	let editEnabled = $state(false);

	function toggleLayout() {
		layout = layout === 'map' ? 'viewer' : 'map';
	}

	function onGroupSequenceSelect(event: CustomEvent<{ sequenceId: number }>) {
		goToSequence(event.detail.sequenceId);
	}

	function onEditEnabledChange(event: CustomEvent<boolean>) {
		trailviewer?.setEditOnZoom(event.detail);
	}

	let selectedIds: string[] = $state([]);

	function onSelectSwitchInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		trailviewer?.enableSelectMode(event.currentTarget.checked);
	}
</script>

<svelte:window onkeypress={handleKeypress} />

<svelte:head>
	<title>TrailView Admin</title>
</svelte:head>

<ConfirmModal bind:this={confirmModal} />

<div class="d-flex flex-row py-1 px-2 justify-content-between">
	<div class="d-flex flex-row gap-2 align-items-center">
		<select
			id="goToSequenceSelect"
			onchange={onSequenceSelectChange}
			class="col-auto form-select form-select-sm"
			style="width:210px"
			bind:this={goToSequenceSelect}
		>
			<option value="select">Go To Sequence</option>
			{#each data.sequences as sequence}
				<option class="sequence-option" value={sequence.id}>{sequence.name}</option>
			{/each}
		</select>
		<select
			onchange={onGoToGroupChange}
			class="col-auto form-select form-select-sm"
			style="width:210px"
		>
			<option value="select">Go To Group</option>
			{#each data.groups as group}
				<option value={`group_${group.id}`}>{group.name}</option>
			{/each}
		</select>
		{#if currentSequence !== undefined && currentSequence.id !== highlightedSequenceId}
			<button
				in:scale
				onclick={() => {
					if (currentSequence !== undefined) {
						highlightSequence(currentSequence.id);
					}
				}}
				type="button"
				class="btn btn-sm btn-outline-warning">Highlight image sequence</button
			>
		{/if}
		{#if highlightedSequenceId !== undefined}
			<button
				in:scale
				onclick={() => {
					trailviewer?.map?.removeLayer('sequenceLayer');
					trailviewer?.map?.removeSource('sequenceSource');
					highlightedSequenceId = undefined;
				}}
				type="button"
				class="btn btn-sm btn-outline-warning">Remove sequence highlight</button
			>
		{/if}
		{#if selectedGroupId !== undefined}
			<button
				onclick={removeGroupHighlight}
				transition:scale
				type="button"
				class="btn btn-sm btn-outline-info"
			>
				Remove group highlight</button
			>
		{/if}
		<div class="form-check form-switch">
			<input
				oninput={onSelectSwitchInput}
				class="form-check-input"
				type="checkbox"
				role="switch"
				id="selectSwitch"
			/>
			<label class="form-check-label" for="selectSwitch">Select Mode</label>
		</div>
		{#if selectedIds.length !== 0}
			<button
				transition:scale
				onclick={() => {
					trailviewer?.clearSelection();
				}}
				type="button"
				class="btn btn-sm btn-outline-secondary"
			>
				Clear Selection
			</button>
			<form
				transition:scale
				class="d-flex flex-row gap-2 align-items-center"
				method="POST"
				use:enhance={() => {
					return async ({ update }) => {
						await update({ reset: false });
						await refreshEverything();
						selectedIds = [];
						trailviewer?.enableSelectMode(true);
					};
				}}
			>
				<input name="imageIds" type="hidden" value={JSON.stringify(selectedIds)} />
				<button formaction="?/select-public" type="submit" class="btn btn-sm btn-success">
					Make Public
				</button>
				<button formaction="?/select-private" type="submit" class="btn btn-sm btn-danger">
					Make Private
				</button>
			</form>
		{/if}
	</div>
	<div class="d-flex flex-row-reverse gap-1">
		<form
			action="?/refresh"
			method="POST"
			use:enhance={() => {
				showCacheSpinner = true;
				return async ({ update }) => {
					await update({ reset: false });
					showCacheSpinner = false;
					refreshEverything();
				};
			}}
		>
			<button class="btn btn-sm btn-info"
				>{#if showCacheSpinner}<span class="spinner-border spinner-border-sm"></span>{/if} Refresh Cache</button
			>
		</form>
	</div>
</div>
<hr class="my-0" />

<div class="d-flex flex-row flex-grow-1">
	<div class="col position-relative">
		{#if editEnabled}
			<div transition:slide class="edit-indicator">Edit Mode Enabled</div>
		{/if}
		<div id="trailview_map" class={layout === 'map' ? 'main-container' : 'small-container'}></div>
		<div
			id="trailview_panorama"
			class={layout === 'viewer' ? 'main-container' : 'small-container'}
		></div>
		<button
			onclick={toggleLayout}
			type="button"
			class="btn btn-sm btn-light expand-btn"
			aria-label="expand"
		>
			<i class="bi bi-arrows-angle-expand"></i>
		</button>
	</div>
	<div style="width:370px">
		<div class="mt-1 mx-2">
			<FormAlert bind:this={formAlert} />
			<ul class="nav nav-tabs mb-2">
				{#each inspectorPages as page}
					<li class="nav-item">
						<button
							onclick={() => {
								inspectorPage = page;
							}}
							class={`nav-link ${inspectorPage === page ? 'active' : ''}`}>{page}</button
						>
					</li>
				{/each}
			</ul>
			{#if inspectorPage === 'Sequence'}
				<InspectorSequence
					{trailviewer}
					{currentImage}
					{currentSequence}
					bind:pitchCorrection
					bind:flipped
					mapsApiTrails={data.mapsApiTrails}
					on:should-refresh={refreshEverything}
				/>
			{:else if inspectorPage === 'Image(s)'}
				<InspectorImage
					{confirmModal}
					{formAlert}
					{trailviewer}
					{currentImage}
					on:should-refresh={refreshEverything}
				/>
			{:else if inspectorPage === 'Group'}
				<InspectorGroup
					{formAlert}
					{trailviewer}
					{confirmModal}
					groupData={data.groups}
					sequenceData={data.sequences}
					bind:selectedGroupId
					on:draw-group={(e) => {
						highlightGroup(e.detail.groupId);
					}}
					on:should-refresh={refreshEverything}
					on:sequence-select={onGroupSequenceSelect}
				/>
			{:else if inspectorPage === 'Move'}
				<InspectorMove
					{trailviewer}
					on:should-refresh={refreshEverything}
					on:edit-enabled={onEditEnabledChange}
				/>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.edit-indicator {
		position: absolute;
		background-color: red;
		padding: 5px;
		font-size: 18px;
		border-radius: 10px;
		font-weight: bold;
		color: white;
		top: 5px;
		right: 5px;
		z-index: 10;
		box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
	}

	.main-container {
		width: 100%;
		height: 100%;
	}

	.small-container {
		position: absolute;
		left: 8px;
		bottom: 8px;
		width: 400px;
		height: 300px;
		z-index: 11;
		overflow: hidden;
		border-radius: 5px;
		outline-style: solid;
		outline-width: 3px;
		outline-color: rgba(0, 0, 0, 0.4);
	}

	.expand-btn {
		position: absolute;
		left: 370px;
		bottom: 270px;
		z-index: 100;
		border-style: solid;
		border-width: 2px;
		border-color: rgba(0, 0, 0, 0.4);
	}
</style>
