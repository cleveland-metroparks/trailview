<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="d-flex flex-row py-1 px-2 w-100 justify-content-between">
	<div class="d-flex flex-row gap-3 align-items-center">
		<h1 class="me-3 mb-0" style="font-size:24px">
			<a href="/admin" class="text-decoration-none text-body-emphasis">TrailView Admin</a>
		</h1>
		<a href="/admin">Home</a>
		<a href="/admin/import">Import</a>
		<a href="/admin/sequence-list">Sequence List</a>
		<a href="/admin/analytics">Analytics</a>
		<a href="/admin/api-keys">API Keys</a>
	</div>
	<div class="d-flex flex-row-reverse">
		<button
			on:click={async () => {
				const res = await fetch('/logout', { method: 'POST' });
				const data = await res.json();
				if (data.success === true) {
					goto('/login');
				}
			}}
			type="button"
			class="btn btn-sm btn-secondary align-self-center">Logout</button
		>
	</div>
</div>
<hr class="my-0" />
