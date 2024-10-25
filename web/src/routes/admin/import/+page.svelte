<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { slide } from 'svelte/transition';

	let progressBar: HTMLDivElement | undefined = $state();
	let progressFileName: string | undefined = $state();
	let uploading = $state(false);
	let files: FileList | undefined = $state();
	let sequenceName: string = $state('');
	let error = $state(false);
	let errorMessage: string | undefined = $state();
	let complete = $state(false);

	$effect(() => {
		if (browser) {
			window.onbeforeunload = uploading
				? () => {
						return true;
					}
				: null;
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (error === true) {
			return;
		}
		if (files === undefined) {
			throw new Error('files undefined');
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
			let success = false;
			for (let j = 0; j < 20; ++j) {
				const file = files[i];
				const formData = new FormData();
				formData.append('file', file);
				formData.append('fileName', file.name);
				formData.append('sequenceName', sequenceName);
				progressFileName = file.name;
				const res = await fetch('/admin/import', {
					method: 'POST',
					body: formData,
					cache: 'no-store',
					keepalive: false
				});
				const data = await res.json();
				if (data.success !== true) {
					continue;
				}
				updateProgress((i + 1) / total);
				success = true;
				break;
			}
			if (!success) {
				error = true;
				uploading = false;
				throw new Error('Failed to upload');
			}
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
		if (progressBar === undefined) {
			throw new Error('progressBar undefined');
		}
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

<div class="container">
	{#if error || complete}
		<div
			transition:slide
			class={`mt-3 alert alert-${error ? 'danger' : complete ? 'success' : 'secondary'}`}
		>
			{error
				? (errorMessage ?? 'An error has occured, uploading cancelled')
				: complete
					? 'Upload complete!'
					: 'Undefined'}
		</div>
	{/if}

	<form class="mt-3" onsubmit={handleSubmit}>
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
			<div transition:slide id="progressBar" class="progress" role="progressbar">
				<div bind:this={progressBar} class="progress-bar"></div>
			</div>
		</div>
	{/if}
</div>
