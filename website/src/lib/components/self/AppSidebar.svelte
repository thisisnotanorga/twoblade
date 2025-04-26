<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {
		ArrowUpCircle,
		Moon,
		Sun,
		Inbox,
		Star,
		Clock,
		Send,
		NotepadTextIcon,
		ClockFading,
		Mails,
		CircleAlert,
		Trash2,
		UsersRound,
		Info,
		MessagesSquare,
		Tag,
		ArrowDown,
		ArrowUp
	} from 'lucide-svelte';
	import { mode, setMode } from 'mode-watcher';
	import type { HTMLAttributes } from 'svelte/elements';

	const data = {
		navMain: [
			{ title: 'Inbox', url: '#', icon: Inbox },
			{ title: 'Starred', url: '#', icon: Star },
			{ title: 'Snoozed', url: '#', icon: Clock },
			{ title: 'Sent', url: '#', icon: Send },
			{ title: 'Drafts', url: '#', icon: NotepadTextIcon }
		],
		navMore: [
			{ title: 'Scheduled', url: '#', icon: ClockFading },
			{ title: 'All Mail', url: '#', icon: Mails },
			{ title: 'Spam', url: '#', icon: CircleAlert },
			{ title: 'Trash', url: '#', icon: Trash2 }
		],
		categories: [
			{ title: 'Social', url: '#', icon: UsersRound },
			{ title: 'Updates', url: '#', icon: Info },
			{ title: 'Forums', url: '#', icon: MessagesSquare },
			{ title: 'Promotions', url: '#', icon: Tag }
		]
	};
	let isExpanded = $state(false);
	type MenuButtonProps = HTMLAttributes<HTMLAnchorElement | HTMLButtonElement>;
</script>

<Sidebar.Root collapsible="offcanvas" variant="inset">
	<Sidebar.Header>
		<div class="flex items-center gap-2 px-2 py-2">
			<ArrowUpCircle class="h-5 w-5" />
			<!-- TODO: logo -->
			<span class="text-base font-semibold">Twoblade</span>
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Main Navigation</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each data.navMain as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								{#snippet child({ props }: { props: MenuButtonProps })}
									<a href={item.url || '/'} {...props}>
										<item.icon />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props }: { props: MenuButtonProps })}
								<button
									onclick={() => (isExpanded = !isExpanded)}
									{...props}
									class={`${isExpanded ? 'bg-sidebar-accent' : ''} ${props.class}`}
								>
									{#if isExpanded}
										<ArrowUp />
									{:else}
										<ArrowDown />
									{/if}
									<span>{isExpanded ? 'Show less' : 'Show more'}</span>
								</button>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>

					<!-- Conditional rendering for additional items -->
					{#if isExpanded}
						{#each data.navMore as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton>
									{#snippet child({ props }: { props: MenuButtonProps })}
										<a href={item.url || '/'} {...props}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}

						<!-- Categories section -->
						<Sidebar.MenuItem>
							<Sidebar.GroupLabel>Categories</Sidebar.GroupLabel>
						</Sidebar.MenuItem>
						{#each data.categories as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton>
									{#snippet child({ props }: { props: MenuButtonProps })}
										<a href={item.url || '/'} {...props}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					{/if}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props }: { props: MenuButtonProps })}
								<button onclick={() => setMode($mode === 'light' ? 'dark' : 'light')} {...props}>
									{#if $mode === 'light'}
										<Moon class="h-5 w-5" />
										<span>Dark Mode</span>
									{:else}
										<Sun class="h-5 w-5" />
										<span>Light Mode</span>
									{/if}
								</button>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
