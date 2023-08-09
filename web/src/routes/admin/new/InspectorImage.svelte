<script lang="ts">
	import { enhance } from '$app/forms';
	import { createEventDispatcher } from 'svelte';
	import type { TrailViewer, Image } from '$lib/trailviewer';
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import FormAlert from '$lib/FormAlert.svelte';

	export let currentImage: Image | undefined;
	export let trailviewer: TrailViewer | undefined;

	const dispatch = createEventDispatcher<{
		'should-refresh': void;
	}>();

	let showImageSpinner = false;
	let showPrivateViewSpinner = false;
	let showPublicViewSpinner = false;
	let confirmModal: ConfirmModal;
	let formAlert: FormAlert;

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
		dispatch('should-refresh');
	}
</script>

<FormAlert bind:this={formAlert} />
<ConfirmModal bind:this={confirmModal} />

<form
	method="POST"
	use:enhance={() => {
		showImageSpinner = true;
		return async ({ update }) => {
			await update({ reset: false });
			showImageSpinner = false;
			dispatch('should-refresh');
		};
	}}
>
	<input name="imageId" type="hidden" value={currentImage?.id} />
	<label for="image_id">Image Id</label>
	<input id="image_id" readonly class="form-control" value={currentImage?.id ?? 'Undefined'} />
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
			>{#if showPrivateViewSpinner}<span class="spinner-border spinner-border-sm" />{/if} Set all in
			view private</button
		>
		<button
			on:click={async () => {
				await setViewVisibility(true);
			}}
			type="button"
			class="btn btn-sm btn-warning"
			>{#if showPublicViewSpinner}<span class="spinner-border spinner-border-sm" />{/if} Set all in view
			public</button
		>
	</div>
</form>
