<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import AppSidebar from '$lib/components/self/AppSidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { Toaster } from '$lib/components/ui/sonner';
	import { currentTab } from '$lib/stores/navigation';
	import { page } from '$app/state';
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

	log.setLevel(dev ? log.levels.DEBUG : log.levels.WARN);

	let { children } = $props();

	const isAuthRoute = $derived(!!page.route.id?.startsWith('/(auth)'));
	const isEmailRoute = $derived(page.route.id === '/index');

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
									window.location.reload()
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
					<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />

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

						<EmailClassificationButtons />
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
