<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { mainHeading } from '../stores';
	import { browser } from '$app/environment';
	import { slide } from 'svelte/transition';

	$mainHeading = 'Import Sequence';

	let progressBar: HTMLDivElement;
	let uploading = false;
	let files: FileList;
	let error = false;
	let complete = false;

	$: if (browser) {
		window.onbeforeunload = uploading
			? () => {
					return true;
			  }
			: null;
	}

	async function handleSubmit() {
		if (error === true) {
			return;
		}
		complete = false;
		uploading = true;
		let total = files.length;
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const formData = new FormData();
			formData.append('file', file);
			formData.append('fileName', file.name);
			const res = await fetch('/admin/import', { method: 'POST', body: formData });
			const data = await res.json();
			if (data.success !== true) {
				error = true;
				throw new Error('Failed to upload');
			}
			updateProgress((i + 1) / total);
		}
		complete = true;
		uploading = false;
	}

	function updateProgress(fraction: number) {
		progressBar.style.width = `${(fraction * 100).toFixed(0)}%`;
		progressBar.innerHTML = `${(fraction * 100).toFixed(0)}%`;
	}

	beforeNavigate((nav) => {
		if (uploading) {
			alert('Uploading in progress');
			nav.cancel();
		}
	});
</script>

<a href="/admin" class="btn btn-outline-primary">Dashboard</a>

{#if error || complete}
	<div
		transition:slide
		class={`mt-3 alert alert-${error ? 'danger' : complete ? 'success' : 'secondary'}`}
	>
		{error
			? 'An error has occured, uploading cancelled'
			: complete
			? 'Upload complete!'
			: 'Undefined'}
	</div>
{/if}

<form class="mt-3" on:submit|preventDefault={handleSubmit}>
	<label for="fileInput">Upload images</label>
	<div class="mt-2 input-group">
		<input
			bind:files
			class="form-control"
			type="file"
			id="fileInput"
			name="fileInput"
			required
			multiple
			disabled={uploading}
		/>
		<button type="submit" class="btn btn-success">Upload</button>
	</div>
</form>

{#if uploading}
	<div transition:slide class="mt-3 progress" role="progressbar">
		<div bind:this={progressBar} class="progress-bar" />
	</div>
{/if}
