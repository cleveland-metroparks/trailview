<script lang="ts">
	interface Props {
		name?: string;
		role?: 'standard' | 'admin';
		active?: boolean;
	}

	let { name = '', role = 'standard', active = false }: Props = $props();

	let selectedRole: 'standard' | 'admin' | null = $state(null);
	$effect(() => {
		selectedRole = role;
	});
</script>

<label for="apiKeyName" class="form-label">Name</label>
<input name="name" id="apiKeyName" type="text" class="form-control" value={name} />

<label for="apiKeyRole" class="form-label mt-1">Role</label>
<input type="hidden" value={selectedRole} name="role" />
<div id="apiKeyRole" class="btn-group" role="group">
	<button
		type="button"
		onclick={() => {
			selectedRole = 'standard';
		}}
		id="apiKeyRoleStandard"
		class="btn btn-outline-primary"
		class:active={selectedRole === 'standard'}>Standard</button
	>

	<button
		type="button"
		onclick={() => {
			selectedRole = 'admin';
		}}
		id="apiKeyRoleAdmin"
		class="btn btn-outline-primary"
		class:active={selectedRole === 'admin'}>Admin</button
	>
</div>
<div class="form-check form-switch mt-3">
	<input
		class="form-check-input"
		type="checkbox"
		role="switch"
		id="apiKeyActive"
		name="active"
		checked={active}
	/>
	<label class="form-check-label" for="apiKeyActive">Active</label>
</div>
