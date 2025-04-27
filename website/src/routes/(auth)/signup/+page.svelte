<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { AlertCircle } from 'lucide-svelte';

	let { form }: { form: ActionData } = $props();

	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let clientError = $state('');

	function validateForm() {
		clientError = '';
		if (!username || !password || !confirmPassword) {
			clientError = 'All fields are required.';
			return false;
		}
		if (password !== confirmPassword) {
			clientError = 'Passwords do not match.';
			return false;
		}
		if (password.length < 8) {
			clientError = 'Password must be at least 8 characters long.';
			return false;
		}
		return true;
	}

	function handleSubmit() {
		if (!validateForm()) {
			return;
		}
		isSubmitting = true;
	}

	$effect(() => {
		if (form) {
			isSubmitting = false;
			password = '';
			confirmPassword = '';
			if (form.success) {
				username = '';
			}
		}
	});
</script>

<div class="flex h-screen items-center justify-center">
	<Card class="w-[400px]">
		<CardHeader>
			<CardTitle>Create Account</CardTitle>
			<CardDescription>Enter your desired username and password.</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				use:enhance={() => {
					handleSubmit();
					return async ({ update }) => {
						await update();
					};
				}}
			>
				{#if form?.error || clientError}
					<Alert variant="destructive" class="mb-4">
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{form?.error || clientError}</AlertDescription>
					</Alert>
				{/if}
				{#if form?.success}
					<Alert
						variant="default"
						class="mb-4 border-green-300 bg-green-100 dark:border-green-700 dark:bg-green-900"
					>
						<AlertTitle>Success</AlertTitle>
						<AlertDescription>
							Account created successfully! You can now <a href="/login" class="underline">log in</a
							>.
						</AlertDescription>
					</Alert>
				{/if}

				<div class="grid gap-4">
					<div class="grid gap-2">
						<Label for="username">Username</Label>
						<Input
							id="username"
							name="username"
							bind:value={username}
							required
							disabled={isSubmitting}
						/>
					</div>
					<div class="grid gap-2">
						<Label for="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							bind:value={password}
							required
							minlength={8}
							disabled={isSubmitting}
						/>
					</div>
					<div class="grid gap-2">
						<Label for="confirmPassword">Confirm Password</Label>
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							required
							minlength={8}
							disabled={isSubmitting}
						/>
					</div>
					<Button type="submit" class="w-full" disabled={isSubmitting}>
						{isSubmitting ? 'Creating Account...' : 'Create Account'}
					</Button>
					<div class="mt-4 text-center text-sm">
						Already have an account?
						<a href="/login" class="underline"> Log in </a>
					</div>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
