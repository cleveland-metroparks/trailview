<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { mainHeading } from '../stores';
	import { browser } from '$app/environment';
	import { slide } from 'svelte/transition';

	$mainHeading = 'Import Sequence';

	let progressBar: HTMLDivElement;
	let progressFileName: string | undefined;
	let uploading = false;
	let files: FileList;
	let sequenceName: string;
	let error = false;
	let errorMessage: string | undefined;
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
		const initRes = await fetch('/admin/import/init', {
			method: 'POST',
			body: JSON.stringify({ sequenceName: sequenceName }),
			headers: { 'Content-Type': 'application/json' }
		});
		const dataRes = await initRes.json();
		if (dataRes.success !== true) {
			error = true;
			errorMessage = dataRes.message;
			throw new Error('Failed to upload');
		}
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const formData = new FormData();
			formData.append('file', file);
			formData.append('fileName', file.name);
			formData.append('sequenceName', sequenceName);
			progressFileName = file.name;
			const res = await fetch('/admin/import', { method: 'POST', body: formData });
			const data = await res.json();
			if (data.success !== true) {
				error = true;
				if (data.message !== undefined) {
					errorMessage = data.message;
				}
				uploading = false;
				throw new Error('Failed to upload');
			}
			updateProgress((i + 1) / total);
		}
		const resFinish = await fetch('/admin/import/finish', {
			method: 'POST',
			body: JSON.stringify({ sequenceName: sequenceName }),
			headers: { 'Content-Type': 'application/json' }
		});
		const dataFinish = await resFinish.json();
		if (dataFinish.success !== true) {
			error = true;
			errorMessage = dataFinish.message;
			throw new Error('Failed to finalize upload');
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
		transition:slide|local
		class={`mt-3 alert alert-${error ? 'danger' : complete ? 'success' : 'secondary'}`}
	>
		{error
			? errorMessage ?? 'An error has occured, uploading cancelled'
			: complete
			? 'Upload complete!'
			: 'Undefined'}
	</div>
{/if}

<form class="mt-3" on:submit|preventDefault={handleSubmit}>
	<label for="sequenceName">Sequence Name (Use PascalCase)</label>
	<input bind:value={sequenceName} id="sequenceName" type="text" class="form-control" required />

	<label class="mt-2" for="fileInput">Upload images</label>
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
	<div class="mt-3">
		{#if progressFileName !== undefined}
			<label for="progressBar">{progressFileName}</label>
		{/if}
		<div transition:slide|local id="progressBar" class="progress" role="progressbar">
			<div bind:this={progressBar} class="progress-bar" />
		</div>
	</div>
{/if}
