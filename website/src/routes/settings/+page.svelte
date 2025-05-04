<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { browser } from '$app/environment';
	import { Beaker, TestTubeDiagonal } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { USER_DATA } from '$lib/stores/user';
	import { PUBLIC_DOMAIN } from '$env/static/public';
	import { checkVocabulary } from '$lib/utils';

	let notificationsEnabled = $state(false);

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
</script>

<div class="container max-w-5xl">
	<h1 class="mb-8 text-3xl font-bold">Settings</h1>

	<div class="space-y-6">
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
				<Card.Title>Danger Zone</Card.Title>
				<Card.Description>Irreversible and destructive actions</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-col space-y-2">
					<Button variant="destructive">Delete All Data</Button>
					<p class="text-muted-foreground text-sm">
						This will permanently delete all your emails and settings. This action cannot be undone.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
