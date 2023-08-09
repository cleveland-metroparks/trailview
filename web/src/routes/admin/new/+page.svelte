<script context="module" lang="ts">
	export type MapsApiTrailsType = {
		id: number;
		name: string;
		description: string;
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
	import { PUBLIC_MAPBOX_KEY } from '$env/static/public';
	import type { TrailViewer, Image } from '$lib/trailviewer';
	import { onDestroy, onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import FormAlert from '$lib/FormAlert.svelte';
	import type { PageData } from './$types';
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import type { GetResType as GroupGetResType } from '../../api/group/[groupId]/all/+server';
	import type { GeoJSONSource } from 'mapbox-gl';
	import type { FeatureCollection } from 'geojson';
	import type { PatchReqType as GroupPatchReqType } from '../(current)/edit/group/[groupId]/view/+server';
	import { scale } from 'svelte/transition';
	import type { PatchReqType as GroupSeqPatchReqType } from '../(current)/edit/group/[groupId]/sequence/+server';
	import InspectorSequence from './InspectorSequence.svelte';

	export let data: PageData;

	function handleKeypress(event: KeyboardEvent) {
		if (event.key === 'z' && trailviewer !== undefined) {
			trailviewer.undoEdit();
		}
	}

	function refreshEverything() {
		if (trailviewer !== undefined) {
			trailviewer.destroy();
			createTrailViewer();
			trailviewer.fetchAllImageData();
		}
		hasMapGroupLayer = false;
	}

	function onPitchCorrectionChange(event: CustomEvent<number>) {
		if (!trailviewer || !currentImage) {
			return;
		}
		if (trailviewer.allImageData !== undefined) {
			trailviewer.overridePitchCorrection(event.detail);
		}
	}

	async function onGoToGroupChange(event: Event) {
		const groupSelect = event.target as HTMLSelectElement;
		const selectValue = groupSelect.value;
		groupSelect.value = 'select';
		if (selectValue.startsWith('group_')) {
			const groupId = parseInt(selectValue.split('_')[1]);
			const res = await fetch(`/api/group/${groupId}/all`, { method: 'GET' });
			const resData = (await res.json()) as GroupGetResType;
			if (resData.success === true) {
				const image = resData.data.images.at(0);
				if (image !== undefined) {
					trailviewer?.goToImageID(image.id);
					inspectorPage = 'Group';
					selectedGroupId = groupId;
					drawSelectedGroup();
				}
			}
		}
	}

	function onSequenceSelectChange(event: Event) {
		if (trailviewer === undefined) {
			return;
		}
		if (trailviewer.allImageData !== undefined) {
			const image = trailviewer.allImageData.find((image) => {
				const sequence = data.sequences.find((sequence) => {
					return sequence.id === image.sequenceId;
				});
				if (!sequence) {
					return;
				}
				return sequence.name === (event.target as HTMLSelectElement).value;
			});
			if (image) {
				trailviewer.goToImageID(image.id);
				inspectorPage = 'Sequence';
			}
		}
		goToSequenceSelect.value = 'select';
	}

	async function setViewVisibility(visible: boolean) {
		if (
			trailviewer === undefined ||
			trailviewer.allImageData === undefined ||
			trailviewer.map === undefined
		) {
			return;
		}
		if (
			(await confirmModal.prompt(
				`Are you sure you want all set all images in the current view on the map to be ${
					visible ? 'public' : 'private'
				}?`,
				`Confirm Set ${visible ? 'Public' : 'Private'}`
			)) !== true
		) {
			return;
		}
		if (visible) {
			showPublicViewSpinner = true;
		} else {
			showPrivateViewSpinner = true;
		}

		const bounds = trailviewer.map.getBounds();
		const imageIdList: string[] = [];
		for (const image of trailviewer.allImageData) {
			if (bounds.contains([image.longitude, image.latitude])) {
				imageIdList.push(image.id);
			}
		}
		const data = {
			imageIds: imageIdList
		};
		const res = await fetch(visible === true ? '/admin/edit/public' : '/admin/edit/private', {
			method: 'PATCH',
			body: JSON.stringify(data)
		});
		const resData = await res.json();
		formAlert.popup(resData);
		if (visible) {
			showPublicViewSpinner = false;
		} else {
			showPrivateViewSpinner = false;
		}
		refreshEverything();
	}

	async function onChangeViewGroup(action: 'add' | 'remove') {
		if (
			selectedGroupId === undefined ||
			trailviewer === undefined ||
			trailviewer.map === undefined ||
			trailviewer.allImageData === undefined
		) {
			return;
		}
		showGroupSpinner = true;
		const bounds = trailviewer.map.getBounds();
		const imageIdList: string[] = [];
		for (const image of trailviewer.allImageData) {
			if (bounds.contains([image.longitude, image.latitude])) {
				imageIdList.push(image.id);
			}
		}
		const data: GroupPatchReqType = {
			action: action === 'add' ? 'addImages' : 'removeImages',
			imageIds: imageIdList
		};
		const res = await fetch(`/admin/edit/group/${selectedGroupId}/view`, {
			method: 'PATCH',
			body: JSON.stringify(data)
		});
		const resData = await res.json();
		formAlert.popup(resData);
		drawSelectedGroup();
		showGroupSpinner = false;
	}

	let groupSequenceSelectValue: string | undefined;
	async function onGroupSequenceAction(action: 'add' | 'remove') {
		if (selectedGroupId === undefined || groupSequenceSelectValue === undefined) {
			return;
		}
		showGroupSpinner = true;
		const sequenceId = parseInt(groupSequenceSelectValue.split('_')[1]);
		const data: GroupSeqPatchReqType = {
			action: action,
			sequenceId: sequenceId
		};
		const res = await fetch(`/admin/edit/group/${selectedGroupId}/sequence`, {
			method: 'PATCH',
			body: JSON.stringify(data)
		});
		const resData = await res.json();
		formAlert.popup(resData);
		showGroupSpinner = false;
		drawSelectedGroup();
	}

	let hasMapGroupLayer = false;
	async function drawSelectedGroup() {
		if (
			selectedGroupId === undefined ||
			trailviewer === undefined ||
			trailviewer.allImageData === undefined ||
			trailviewer.map === undefined
		) {
			return;
		}
		const res = await fetch(`/api/group/${selectedGroupId}/all`, { method: 'GET' });
		const resData = (await res.json()) as GroupGetResType;
		if (resData.success === false) {
			formAlert.popup(resData);
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
						coordinates: [i.longitude, i.latitude]
					},
					properties: {}
				};
			})
		};

		if (!hasMapGroupLayer) {
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
			hasMapGroupLayer = true;
		} else {
			(trailviewer.map.getSource('groupSource') as GeoJSONSource).setData(geoJsonData);
		}
	}

	let inspectorPages = ['Sequence', 'Image', 'Group', 'Move'] as const;
	let inspectorPage: (typeof inspectorPages)[number] = 'Sequence';

	let selectedGroupId: number | undefined;
	let selectedGroup: (typeof data.groups)[number] | undefined;
	$: selectedGroup = data.groups.find((g) => {
		return g.id === selectedGroupId;
	});

	function onGroupSelectChange(event: Event) {
		const element = event.target as HTMLSelectElement;
		if (element.value.startsWith('group_')) {
			selectedGroupId = parseInt(element.value.split('_')[1]);
			drawSelectedGroup();
		} else {
			selectedGroupId = undefined;
		}
	}

	let currentSequence: { name: string; id: number; mapsApiTrailId: number | null } | undefined;
	let pitchCorrection = 0;
	let flipped: boolean;
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
	}

	onMount(async () => {
		await createTrailViewer();
	});

	onDestroy(() => {
		if (trailviewer) {
			trailviewer.destroy();
		}
	});

	function toggleLayout() {
		layout = layout === 'map' ? 'viewer' : 'map';
	}

	let goToSequenceSelect: HTMLSelectElement;
	let confirmModal: ConfirmModal;
	let formAlert: FormAlert;

	let showCacheSpinner = false;
	let showImageSpinner = false;
	let showPublicViewSpinner = false;
	let showPrivateViewSpinner = false;
	let showEditSpinner = false;
	let showGroupSpinner = false;

	let layout: 'viewer' | 'map' = 'map';

	$: if (layout) {
		setTimeout(() => {
			trailviewer?.map?.resize();
			trailviewer?.centerMarker();
		}, 0);
	}
</script>

<svelte:window on:keypress={handleKeypress} />

<svelte:head>
	<title>TrailView Admin</title>
</svelte:head>

<ConfirmModal bind:this={confirmModal} />

<div class="d-flex flex-row py-1 px-2 justify-content-between">
	<div class="d-flex flex-row gap-1">
		<select
			id="goToSequenceSelect"
			on:change={onSequenceSelectChange}
			class="col-auto form-select form-select-sm"
			style="width:210px"
			bind:this={goToSequenceSelect}
		>
			<option value="select">Go To Sequence</option>
			{#each data.sequences as sequence}
				<option class="sequence-option" id={`sequence_${sequence.id}`}>{sequence.name}</option>
			{/each}
		</select>
		<select
			on:change={onGoToGroupChange}
			class="col-auto form-select form-select-sm"
			style="width:210px"
		>
			<option value="select">Go To Group</option>
			{#each data.groups as group}
				<option value={`group_${group.id}`}>{group.name}</option>
			{/each}
		</select>
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
				>{#if showCacheSpinner}<span class="spinner-border spinner-border-sm" />{/if} Refresh DB Cache</button
			>
		</form>
	</div>
</div>
<hr class="my-0" />

<div class="d-flex flex-row flex-grow-1">
	<div class="col position-relative">
		<div id="trailview_map" class={layout === 'map' ? 'main-container' : 'small-container'} />
		<div
			id="trailview_panorama"
			class={layout === 'viewer' ? 'main-container' : 'small-container'}
		/>
		<button on:click={toggleLayout} type="button" class="btn btn-sm btn-light expand-btn"
			><i class="bi bi-arrows-angle-expand"></i></button
		>
	</div>
	<div style="width:350px">
		<div class="mt-1 mx-2">
			<FormAlert bind:this={formAlert} />
			<ul class="nav nav-tabs mb-2">
				{#each inspectorPages as page}
					<li class="nav-item">
						<button
							on:click={() => {
								inspectorPage = page;
							}}
							class={`nav-link ${inspectorPage === page ? 'active' : ''}`}>{page}</button
						>
					</li>
				{/each}
			</ul>
			{#if inspectorPage === 'Sequence'}
				<InspectorSequence
					{currentImage}
					{currentSequence}
					bind:pitchCorrection
					bind:flipped
					mapsApiTrails={data.mapsApi.trails}
					on:pitch-correction-change={onPitchCorrectionChange}
					on:should-refresh={refreshEverything}
					on:should-view-side={() => {
						if (trailviewer) {
							trailviewer.getPanViewer()?.lookAt(0, 90, 120, false);
						}
					}}
				/>
			{:else if inspectorPage === 'Image'}
				<form
					method="POST"
					use:enhance={() => {
						showImageSpinner = true;
						return async ({ update }) => {
							await update({ reset: false });
							showImageSpinner = false;
							refreshEverything();
						};
					}}
				>
					<input name="imageId" type="hidden" value={currentImage?.id} />
					<label for="image_id">Image Id</label>
					<input
						id="image_id"
						readonly
						class="form-control"
						value={currentImage?.id ?? 'Undefined'}
					/>
					<div class="mt-2 form-check form-switch">
						<input
							checked={(() => {
								return currentImage?.visibility ?? false;
							})()}
							name="public"
							id="image_public_switch"
							class="form-check-input"
							type="checkbox"
							role="switch"
						/>
						<label class="form-check-label" for="image_public_switch">Publicly Visible</label>
					</div>

					<button formaction="?/image" type="submit" class="btn btn-sm btn-primary"
						>{#if showImageSpinner}<span class="spinner-border spinner-border-sm" />{/if} Set</button
					>
					<div class="d-flex flex-row mt-2 gap-2">
						<button
							on:click={async () => {
								await setViewVisibility(false);
							}}
							type="button"
							class="btn btn-sm btn-warning"
							>{#if showPrivateViewSpinner}<span class="spinner-border spinner-border-sm" />{/if} Set
							all in view private</button
						>
						<button
							on:click={async () => {
								await setViewVisibility(true);
							}}
							type="button"
							class="btn btn-sm btn-warning"
							>{#if showPublicViewSpinner}<span class="spinner-border spinner-border-sm" />{/if} Set
							all in view public</button
						>
					</div>
				</form>
			{:else if inspectorPage === 'Group'}
				<label for="groupSelect">Create Group</label>
				<form action="?/create-group" method="POST" use:enhance>
					<div class="input-group input-group-sm">
						<input name="name" class="form-control" type="text" placeholder="New Name" required />
						<button class="btn btn-sm btn-success">Create</button>
					</div>
				</form>
				<label class="mt-1" for="groupSelect">Select Group</label>
				<select on:change={onGroupSelectChange} class="form-select form-select-sm" id="groupSelect">
					<option value="select">Select</option>
					{#each data.groups as group}
						<option value={`group_${group.id}`} selected={selectedGroupId === group.id}
							>{group.name}</option
						>
					{/each}
				</select>
				{#if selectedGroup !== undefined}
					<div class="mt-2 input-group input-group-sm">
						<span class="input-group-text">Group Id</span>
						<input type="text" class="form-control" readonly value={selectedGroup.id.toString()} />
					</div>
					<div class="mt-2 d-flex flex-row gap-2 flex-wrap">
						<button
							on:click={() => {
								onChangeViewGroup('add');
							}}
							class="btn btn-sm btn-success">Assign all Images in View to Group</button
						>
						<button
							on:click={() => {
								onChangeViewGroup('remove');
							}}
							class="btn btn-sm btn-danger">Remove all Images in View from Group</button
						>
					</div>
					<hr />
					<h5>From Sequence</h5>
					<select bind:value={groupSequenceSelectValue} class="form-select form-select-sm">
						{#each data.sequences as sequence}
							<option value={`seq_${sequence.id}`}>{sequence.name}</option>
						{/each}
					</select>
					<div class="mt-1 d-flex flex-row gap-2">
						<button
							on:click={() => {
								onGroupSequenceAction('add');
							}}
							class="btn btn-sm btn-success">Add from sequence</button
						>
						<button
							on:click={() => {
								onGroupSequenceAction('remove');
							}}
							class="btn btn-sm btn-danger">Remove from sequence</button
						>
					</div>

					{#if showGroupSpinner}
						<div transition:scale class="mt-2 spinner-border" role="status">
							<span class="visually-hidden">Loading...</span>
						</div>
					{/if}
					<hr />
					<form
						action="?/delete-group"
						method="POST"
						use:enhance={async ({ cancel }) => {
							if (
								selectedGroup === undefined ||
								(await confirmModal.prompt(
									`Are you sure you want to delete this group (${selectedGroup.name})?`
								)) !== true
							) {
								cancel();
							}
							return async ({ update }) => {
								await update();
								refreshEverything();
							};
						}}
					>
						<input name="groupId" type="hidden" value={selectedGroupId?.toString()} />
						<button class="btn btn-sm btn-danger">Delete Group</button>
					</form>
				{/if}
			{:else if inspectorPage === 'Move'}
				<button
					on:click={() => {
						if (trailviewer !== undefined) {
							trailviewer.undoEdit();
						}
					}}
					type="button"
					class="btn btn-warning">Undo Image Move (z)</button
				>
				<button
					on:click={async () => {
						showEditSpinner = true;
						await trailviewer?.submitEdits();
						showEditSpinner = false;
						refreshEverything();
					}}
					type="button"
					class="btn btn-primary"
					>{#if showEditSpinner}<span class="spinner-border spinner-border-sm" />{/if}Submit Changes</button
				>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
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
