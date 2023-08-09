<script context="module" lang="ts">
	export type GroupType = {
		id: number;
		name: string;
	};
	export type SequenceType = {
		name: string;
		id: number;
		mapsApiTrailId: number | null;
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { scale } from 'svelte/transition';
	import type { TrailViewer } from '$lib/trailviewer';
	import type FormAlert from '$lib/FormAlert.svelte';

	import type { PatchReqType as GroupPatchReqType } from './edit/group/[groupId]/view/+server';
	import type { PatchReqType as GroupSeqPatchReqType } from './edit/group/[groupId]/sequence/+server';
	import type ConfirmModal from '$lib/ConfirmModal.svelte';
	import { createEventDispatcher } from 'svelte';

	export let selectedGroupId: number | undefined;
	export let groupData: GroupType[];
	export let sequenceData: SequenceType[];
	export let trailviewer: TrailViewer | undefined;
	export let formAlert: FormAlert;
	export let confirmModal: ConfirmModal;

	const dispatch = createEventDispatcher<{
		'should-refresh': void;
		'draw-group': { groupId: number };
	}>();

	let selectedGroup: GroupType | undefined;
	let showGroupSpinner = false;
	let groupSequenceSelectValue: string | undefined;

	$: selectedGroup = groupData.find((g) => {
		return g.id === selectedGroupId;
	});

	function onGroupSelectChange(event: Event) {
		const element = event.target as HTMLSelectElement;
		if (element.value.startsWith('group_')) {
			selectedGroupId = parseInt(element.value.split('_')[1]);
			dispatch('draw-group', { groupId: selectedGroupId });
		} else {
			selectedGroupId = undefined;
		}
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
		dispatch('draw-group', { groupId: selectedGroupId });
		showGroupSpinner = false;
	}

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
		dispatch('draw-group', { groupId: selectedGroupId });
	}
</script>

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
	{#each groupData as group}
		<option value={`group_${group.id}`} selected={selectedGroupId === group.id}>{group.name}</option
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
		{#each sequenceData as sequence}
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
				dispatch('should-refresh');
			};
		}}
	>
		<input name="groupId" type="hidden" value={selectedGroupId?.toString()} />
		<button class="btn btn-sm btn-danger">Delete Group</button>
	</form>
{/if}
