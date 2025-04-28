<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import AppSidebar from '$lib/components/self/AppSidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { Toaster } from '$lib/components/ui/sonner';
	import { currentTab } from '$lib/stores/navigation';
	import { USER_DATA } from '$lib/stores/user';
	import { page } from '$app/state';

	let { children, data } = $props();

	$effect(() => {
		USER_DATA.set(data.user);
	});

	const isAuthRoute = $derived(!!page.route.id?.startsWith('/(auth)'));
</script>

<ModeWatcher />
<Toaster />

<Sidebar.Provider>
	{#if !isAuthRoute}
		<AppSidebar />
	{/if}
	<Sidebar.Inset>
		{#if !isAuthRoute}
			<header
				class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear"
			>
				<div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
					<Sidebar.Trigger class="-ml-1" />
					<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
					<h1 class="text-base font-medium">{$currentTab}</h1>
				</div>
			</header>
		{/if}

		<div class="flex flex-1 flex-col">
			<div class="@container/main</div> flex flex-1 flex-col gap-2">
				<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
					<div class="px-4 lg:px-6">
						{@render children()}
					</div>
				</div>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
