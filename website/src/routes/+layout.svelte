<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import AppSidebar from '$lib/components/self/AppSidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { Toaster } from '$lib/components/ui/sonner';
	import { currentTab } from '$lib/stores/navigation';
	import EmailClassificationButtons from '$lib/components/self/EmailClassificationButtons.svelte';
	import log from '$lib/logger';
	import { dev } from '$app/environment';
	import IconInput from '$lib/components/self/IconInput.svelte';
	import {
		searchQuery,
		searchResults,
		lastSearchedQuery,
		clearSearch
	} from '$lib/stores/searchStore';
	import { Search } from 'lucide-svelte';
	import { debounce } from '$lib/utils';
	import { isOffline } from '$lib/stores/network';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { lastPollTime, isPolling, POLLING_INTERVAL, seenEmailIds } from '$lib/stores/polling';
	import { browser } from '$app/environment';
	import { USER_DATA } from '$lib/stores/user';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { Email } from '$lib/types/email';
	import { activeUsers } from '$lib/stores/users';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ChevronDown } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	log.setLevel(dev ? log.levels.DEBUG : log.levels.WARN);

	let { children } = $props();

	const isAuthRoute = $derived(!!page.route.id?.startsWith('/(auth)'));
	const isEmailRoute = $derived(page.route.id === '/index');
	const isChatRoute = $derived(page.route.id === '/chat');

	const performSearch = async (query: string) => {
		if (!query.trim()) {
			clearSearch();
			return;
		}
		try {
			const response = await fetch(`/api/emails/search?q=${encodeURIComponent(query)}`);
			const results = await response.json();
			searchResults.set(results);
			lastSearchedQuery.set(query);
		} catch (error) {
			console.error('Search error:', error);
		}
	};

	const debouncedSearch = debounce(performSearch, 300);

	async function detectSWUpdate() {
		const registration = await navigator.serviceWorker.ready;

		registration.addEventListener('updatefound', () => {
			const newSW = registration.installing;
			if (newSW) {
				newSW.addEventListener('statechange', () => {
					if (newSW.state === 'installed') {
						toast.success('New version available. Refresh to update?', {
							duration: Infinity,
							dismissable: true,
							action: {
								label: 'Refresh',
								onClick: async () => {
									log.debug('Refreshing page to update service worker...');
									newSW.postMessage({ type: 'SKIP_WAITING' });
									window.location.reload();
								}
							}
						});
					}
				});
			}
		});
	}
	$effect(() => {
		debouncedSearch($searchQuery);
	});

	let offlineToastId: string | number | undefined;

	$effect(() => {
		const updateNetworkStatus = () => {
			$isOffline = !navigator.onLine;

			if ($isOffline) {
				toast.warning('You are offline. Limited functionality may be available.', {
					duration: Infinity,
					dismissable: true
				});
			}
		};

		updateNetworkStatus();

		window.addEventListener('online', updateNetworkStatus);
		window.addEventListener('offline', updateNetworkStatus);

		return () => {
			window.removeEventListener('online', updateNetworkStatus);
			window.removeEventListener('offline', updateNetworkStatus);
			if (offlineToastId) toast.dismiss(offlineToastId);
		};
	});

	onMount(() => {
		detectSWUpdate();
	});

	async function showEmailNotification(count: number) {
		console.log('Showing email notification:', $lastPollTime.toString(), count);
		const note = new Notification('New Emails', {
			body: `You have ${count} new email${count > 1 ? 's' : ''}`,
			icon: '/favicon.svg',
			tag: $lastPollTime.toString()
		});
		note.onclick = () => {
			window.focus();
			window.location.href = '/index';
			window.location.reload();
		};
	}

	let isFirstPoll = $state(true);

	async function pollForNewEmails() {
		if (!browser || $isOffline || !page.data.user || $isPolling) return;

		$isPolling = true;

		try {
			const res = await fetch('/api/emails/poll', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lastPollTime: $lastPollTime, isFirstPoll })
			});

			if (!res.ok) {
				console.error('Polling failed:', res.status);
				return;
			}

			const data = await res.json();
			const seen = $seenEmailIds;
			const trulyNewEmails = data.emails?.filter((e: Email) => !seen.has(e.id)) || [];

			if (data.emails?.length > 0) {
				seenEmailIds.update((currentSet) => {
					const updatedSet = new Set(currentSet);
					data.emails.forEach((e: Email) => updatedSet.add(e.id));
					return updatedSet;
				});

				if (
					trulyNewEmails.length > 0 &&
					!isFirstPoll &&
					$USER_DATA?.settings?.notifications_enabled
				) {
					await showEmailNotification(trulyNewEmails.length);
				}

				await invalidateAll();
			}
		} catch (e) {
			console.error('Polling error:', e);
		} finally {
			$lastPollTime = Date.now();
			isFirstPoll = false;
			$isPolling = false;
		}
	}

	let pollInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		if (browser) {
			detectSWUpdate();
			$lastPollTime = Date.now();
			pollInterval = setInterval(pollForNewEmails, POLLING_INTERVAL);
		}

		return () => {
			if (pollInterval) {
				clearInterval(pollInterval);
			}
		};
	});

	$effect(() => {
		const route = page.route.id;
		if (route === '/chat') $currentTab = 'Chat';
		else if (route === '/starred') $currentTab = 'Starred';
		else if (route === '/snoozed') $currentTab = 'Snoozed';
		else if (route === '/sent') $currentTab = 'Sent';
		else if (route === '/drafts') $currentTab = 'Drafts';
		else if (route === '/contacts') $currentTab = 'Contacts';
		else if (route === '/scheduled') $currentTab = 'Scheduled';
		else if (route === '/spam') $currentTab = 'Spam';
		else if (route === '/settings') $currentTab = 'Settings';
		else if (route === '/admin') $currentTab = 'Admin';
		else $currentTab = 'Inbox';
	});
</script>

<ModeWatcher />
<Toaster richColors />

<Sidebar.Provider>
	{#if !isAuthRoute}
		<AppSidebar />
	{/if}
	<Sidebar.Inset class="sidebar-container">
		{#if !isAuthRoute}
			<header
				class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear"
			>
				<div class="flex w-full items-center gap-4 px-4 lg:px-6">
					<Sidebar.Trigger class="-ml-1" />

					<h1 class="mr-6 text-base font-medium">{$currentTab}</h1>

					{#if isEmailRoute}
						<div class="flex-1">
							<IconInput
								type="search"
								icon={Search}
								placeholder="Search emails..."
								bind:value={$searchQuery}
								class="h-8 w-full"
							/>
						</div>

						<div class="hidden md:block">
							<EmailClassificationButtons />
						</div>

						<div class="md:hidden">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<ChevronDown class="h-4 w-4" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<EmailClassificationButtons />
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>
					{/if}

					{#if isChatRoute}
						<div class="flex items-center gap-2">
							<span class="relative flex h-3 w-3">
								<span
									class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
								></span>
								<span class="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
							</span>
							<span class="text-muted-foreground text-sm">{$activeUsers} online</span>
						</div>
					{/if}
				</div>
			</header>
		{/if}

		<div class="main-content-area">
			<div class="@container/main flex flex-col gap-2">
				<div class="flex flex-col gap-4 md:gap-6">
					<div class="px-4 md:py-4 lg:px-6">
						{@render children()}
					</div>
				</div>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<style>
	:global(.main-content-area) {
		height: calc(100vh - 3rem - 2rem);
		overflow: hidden;
	}

	:global(.sidebar-container) {
		height: calc(100vh - 3rem - 2rem);
		overflow: hidden;
	}
</style>
