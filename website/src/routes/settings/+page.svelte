<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { TestTubeDiagonal } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { USER_DATA } from '$lib/stores/user';
	import { checkVocabulary } from '$lib/utils';
	import { onDestroy } from 'svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { Download, Trash2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let notificationsEnabled = $state(false);
	let exportStatus = $state('none');
	let exportProgress = $state(0);
	let exportInterval: NodeJS.Timeout;

	$effect(() => {
		if ($USER_DATA?.settings) {
			notificationsEnabled = $USER_DATA.settings.notifications_enabled;
		}
	});

	function sendTestNotification() {
		if (!notificationsEnabled) {
			toast.error('Notifications are not enabled.');
			return;
		}

		try {
			const notification = new Notification('Test Notification', {
				body: 'This is a test notification from Twoblade.',
				icon: '/favicon.svg',
				tag: Math.random().toString(36).substring(2, 15)
			});

			notification.onclick = () => window.focus();
		} catch (e) {
			toast.error('Could not show test notification.');
		}
	}

	async function handleToggleNotifications() {
		try {
			if (!notificationsEnabled) {
				const permission = await Notification.requestPermission();
				if (permission !== 'granted') {
					toast.error('Please allow notifications in your browser settings');
					return;
				}
			}

			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					notifications_enabled: !notificationsEnabled
				})
			});

			if (response.ok) {
				notificationsEnabled = !notificationsEnabled;
				if (notificationsEnabled) {
					toast.success('Notifications enabled');
					sendTestNotification();
				} else {
					toast.success('Notifications disabled');
				}
			}
		} catch (error) {
			toast.error('Failed to update notification settings');
		}
	}
	let vocabularyLimit = $derived(!$USER_DATA?.iq ? null : checkVocabulary('', $USER_DATA.iq).limit);

	let vocabularyDescription = $derived(
		vocabularyLimit === null
			? 'No word length restrictions'
			: `Limited to ${vocabularyLimit}-letter words`
	);

	let vocabularyInfo = $derived(
		!$USER_DATA?.iq
			? null
			: {
					iq: $USER_DATA.iq,
					limit: vocabularyLimit,
					description: vocabularyDescription
				}
	);

	async function requestDataExport() {
		const res = await fetch('/api/settings/data-export', {
			method: 'POST'
		});
		if (!res.ok) {
			toast.error((await res.json()).message || 'Export failed');
			return;
		}
		exportStatus = 'processing';
		exportInterval = setInterval(checkExportStatus, 1000);
	}

	async function checkExportStatus() {
		const res = await fetch('/api/settings/data-export');
		if (!res.ok) {
			clearInterval(exportInterval);
			exportStatus = 'none';
			return;
		}

		const data = await res.json();
		if (data.status === 'processing') {
			exportProgress = data.progress;
		} else if (data.status === 'completed') {
			clearInterval(exportInterval);
			exportProgress = 100;
			exportStatus = 'completed';
			toast.success('Export ready! Click to download.');
		} else {
			clearInterval(exportInterval);
			exportStatus = 'none';
			exportProgress = 0;
		}
	}

	async function handleExportButtonClick() {
		if (exportStatus === 'completed') {
			exportStatus = 'downloading';
			try {
				const res = await fetch('/api/settings/data-export?action=download');
				if (!res.ok) throw new Error(`Failed to download`);

				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'user-data.json';
				a.click();
				URL.revokeObjectURL(url);

				exportStatus = 'none';
				exportProgress = 0;
			} catch {
				exportStatus = 'completed';
				toast.error('Download failed');
			}
		} else if (exportStatus === 'none') {
			requestDataExport();
		}
	}

	async function handleDeleteAccount() {
		if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
			return;
		}

		try {
			const res = await fetch('/api/settings', { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete account');
			toast.success('Account deleted successfully');
			goto('/login');
		} catch {
			toast.error('Failed to delete account');
		}
	}

	onDestroy(() => {
		if (exportInterval) clearInterval(exportInterval);
	});
</script>

<div class="container max-w-5xl h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
	<h1 class="mb-8 text-3xl font-bold shrink-0">Settings</h1>

	<div class="space-y-6 overflow-y-auto">
		{#if $USER_DATA}
			<Card.Root>
				<Card.Header>
					<Card.Title>Account</Card.Title>
					<Card.Description>Manage your account settings</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="flex items-center gap-4">
						<Label for="email" class="flex-1">
							<span>Email</span>
							<span class="text-muted-foreground block text-sm font-normal">Your email address</span
							>
						</Label>
						<Label class="text-primary">{$USER_DATA.username}#{$USER_DATA.domain}</Label>
					</div>

					{#if vocabularyInfo}
						<div class="flex items-center gap-4">
							<Label class="flex-1">
								<span>Intelligence Quotient</span>
								<span class="text-muted-foreground block text-sm font-normal"
									>{vocabularyInfo.description}</span
								>
							</Label>
							<Label class="text-primary">{vocabularyInfo.iq} IQ</Label>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
		<Card.Root>
			<Card.Header>
				<Card.Title>Email Preferences</Card.Title>
				<Card.Description>Configure how you interact with emails</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex items-center gap-4">
					<Label for="desktop-notifications" class="flex-1">
						<span>Desktop Notifications</span>
						<span class="text-muted-foreground block text-sm font-normal">
							{#if notificationsEnabled}
								Notifications are enabled
							{:else}
								Click to enable notifications
							{/if}
						</span>
					</Label>

					<div class="flex items-center gap-2">
						<Switch
							id="desktop-notifications"
							checked={notificationsEnabled}
							onclick={handleToggleNotifications}
						/>

						{#if notificationsEnabled}
							<Tooltip.Root>
								<Tooltip.Trigger>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										onclick={sendTestNotification}
									>
										<TestTubeDiagonal class="h-4 w-4" />
									</Button>
								</Tooltip.Trigger>
								<Tooltip.Content>Send test notification</Tooltip.Content>
							</Tooltip.Root>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Data & Privacy</Card.Title>
				<Card.Description>Manage your data and account privacy settings</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="rounded-lg border p-4">
					<div class="flex items-start justify-between">
						<div class="space-y-1">
							<div class="text-sm font-medium">Export Data</div>
							<div class="text-muted-foreground text-sm">
								Download a copy of all your data including emails, settings, and attachments
							</div>
						</div>
						<Button
							variant="outline"
							disabled={exportStatus === 'processing' || exportStatus === 'downloading'}
							onclick={handleExportButtonClick}
							class="flex items-center gap-2"
						>
							<Download class="h-4 w-4" />
							{#if exportStatus === 'processing'}
								Preparing... ({exportProgress}%)
							{:else if exportStatus === 'completed'}
								Download Ready
							{:else if exportStatus === 'downloading'}
								Downloading...
							{:else}
								Export Data
							{/if}
						</Button>
					</div>
					{#if exportStatus === 'processing'}
						<Progress value={exportProgress} class="mt-4 h-2" />
					{/if}
					<p class="text-muted-foreground mt-2 text-xs">
						You can request a new export every 12 hours
					</p>
				</div>

				<div class="border-destructive/50 bg-destructive/5 rounded-lg border p-4">
					<div class="flex items-start justify-between">
						<div class="space-y-1">
							<div class="text-sm font-medium">Delete Account</div>
							<div class="text-muted-foreground text-sm">
								Your account will be deactivated and personal data will be removed
							</div>
						</div>
						<Button
							variant="destructive"
							class="flex items-center gap-2"
							onclick={handleDeleteAccount}
						>
							<Trash2 class="h-4 w-4" />
							Delete Account
						</Button>
					</div>
					<div class="mt-2 space-y-1 text-xs">
						<p class="text-destructive">This action is permanent and cannot be undone</p>
						<p class="text-muted-foreground">
							Your username will be reserved to prevent impersonation. 
            Email conversations will be preserved for other participants.
            Personal data including settings, drafts, and contacts will be permanently deleted.
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
