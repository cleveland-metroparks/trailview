<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Actions } from './$types';
	import { fly, slide } from 'svelte/transition';

	export let form: Actions;
</script>

<div transition:fly={{ y: -50 }} class="container login-modal">
	<h1 style="text-align:center" class="mt-3 mb-3">TrailView<br />Admin Login</h1>
	{#if form}
		<div transition:slide class="alert alert-danger">{form.message ?? 'Invalid'}</div>
	{/if}
	<form action="?/login" method="POST" use:enhance>
		<label class="" for="username_input">Username</label>
		<input type="text" class="form-control" id="username_input" name="username" required />
		<label for="password_input">Password</label>
		<input type="password" class="form-control" id="password_input" name="password" required />
		<div class="text-end">
			<button type="submit" class="mt-3 mb-4 btn btn-success">Login</button>
		</div>
	</form>
</div>

<style>
	.login-modal {
		position: absolute;
		width: 300px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: rgb(48, 53, 59);
		border-radius: 10px;
		box-shadow: 10px;
	}
</style>
