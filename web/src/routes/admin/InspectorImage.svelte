<script lang="ts">
	import { enhance } from '$app/forms';
	import { createEventDispatcher } from 'svelte';
	import moment from 'moment';
	import type { TrailViewer, Image } from '$lib/trailviewer';
	import type ConfirmModal from '$lib/ConfirmModal.svelte';
	import type FormAlert from '$lib/FormAlert.svelte';

	export let currentImage: Image | undefined;
	export let trailviewer: TrailViewer | undefined;
	export let confirmModal: ConfirmModal;
	export let formAlert: FormAlert;

	const dispatch = createEventDispatcher<{
		'should-refresh': void;
	}>();

	let showImageSpinner = false;
	let showPrivateViewSpinner = false;
	let showPublicViewSpinner = false;

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
			if (bounds.contains(image.coordinates)) {
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
	<div class="d-flex flex-column">
		<h4>Image Info</h4>
		<input name="imageId" type="hidden" value={currentImage?.id} />
		<label for="image_id">Image Id</label>
		<input id="image_id" readonly class="form-control" value={currentImage?.id ?? 'Undefined'} />

		{#if currentImage !== undefined}
			<div class="mt-2 input-group input-group-sm">
				<div class="input-group-text">Captured At</div>
				{#if currentImage.createdAt !== null}
					<input
						class="form-control"
						readonly
						type="datetime-local"
						value={moment(currentImage.createdAt).format('YYYY-MM-DDTkk:mm')}
					/>
				{:else}
					<input class="form-control" readonly type="text" value="Unknown" />
				{/if}
			</div>
		{/if}

		<hr />
		<h4>Image Options</h4>

		<div class="mt-2 form-check form-switch">
			<input
				checked={(() => {
					return currentImage?.public ?? false;
				})()}
				name="public"
				id="image_public_switch"
				class="form-check-input"
				type="checkbox"
				role="switch"
			/>
			<label class="form-check-label" for="image_public_switch">Publicly Visible</label>
		</div>

		<div class="d-flex flex-row justify-content-center mt-2">
			<button formaction="?/image" type="submit" class="btn btn-sm btn-primary"
				>{#if showImageSpinner}<span class="spinner-border spinner-border-sm" />{/if} Apply Changes</button
			>
		</div>
		<hr />
		<h4>Images in View</h4>
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
				>{#if showPublicViewSpinner}<span class="spinner-border spinner-border-sm" />{/if} Set all in
				view public</button
			>
		</div>
	</div>
</form>
