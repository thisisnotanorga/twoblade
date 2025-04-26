<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import AppSidebar from '$lib/components/self/AppSidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Separator } from '$lib/components/ui/separator';

	let { children } = $props();
</script>

<ModeWatcher />
<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header
			class="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear"
		>
			<div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<Sidebar.Trigger class="-ml-1" />
				<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
				<h1 class="text-base font-medium">Documents</h1>
			</div>
		</header>

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
