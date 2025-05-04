<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {
		Moon,
		Sun,
		Inbox,
		Star,
		Clock,
		Send,
		NotepadTextIcon,
		ClockFading,
		CircleAlert,
		UsersRound,
		ArrowDown,
		ArrowUp,
		PenSquare,
		Settings,
		MessageCircle
	} from 'lucide-svelte';
	import { mode, setMode } from 'mode-watcher';
	import type { HTMLAttributes } from 'svelte/elements';
	import { currentTab } from '$lib/stores/navigation';
	import Button from '../ui/button/button.svelte';
	import ComposeEmail from '$lib/components/self/ComposeEmail.svelte';
	import StorageUsageBar from './StorageUsageBar.svelte';

	const data = {
		navMain: [
			{ title: 'Inbox', url: '/index', icon: Inbox },
			{ title: 'Chat', url: '/chat', icon: MessageCircle },
			{ title: 'Starred', url: '/starred', icon: Star },
			{ title: 'Snoozed', url: '/snoozed', icon: Clock },
			{ title: 'Sent', url: '/sent', icon: Send },
			{ title: 'Drafts', url: '/drafts', icon: NotepadTextIcon }
		],
		navMore: [
			{ title: 'Contacts', url: '/contacts', icon: UsersRound },
			{ title: 'Scheduled', url: '/scheduled', icon: ClockFading },
			{ title: 'Spam', url: '/spam', icon: CircleAlert },
			{ title: 'Settings', url: '/settings', icon: Settings }
		]
	};
	let isExpanded = $state(false);
	let showCompose = $state(false);
	type MenuButtonProps = HTMLAttributes<HTMLAnchorElement | HTMLButtonElement>;

	function handleNavClick(title: string) {
		$currentTab = title;
	}
</script>

<ComposeEmail bind:isOpen={showCompose} />

<Sidebar.Root collapsible="offcanvas" variant="inset">
	<Sidebar.Header>
		<div class="flex items-center gap-1 px-2 py-2">
			<img src="/logo.svg" class="h-5 w-5" alt="twoblade" />
			<span class="text-base font-semibold">Twoblade</span>
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child()}
								<Button onclick={() => (showCompose = true)} class={`mb-4 h-[3.0rem] w-36`}>
									<PenSquare />
									<span>Compose</span>
								</Button>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					{#each data.navMain as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								{#snippet child({ props }: { props: MenuButtonProps })}
									<a
										href={item.url || '/'}
										onclick={() => handleNavClick(item.title)}
										class={`${
											$currentTab === item.title ? 'bg-accent text-accent-foreground' : ''
										} ${props.class}`}
									>
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
										<a
											href={item.url || '/'}
											onclick={() => handleNavClick(item.title)}
											class={`${
												$currentTab === item.title ? 'bg-accent text-accent-foreground' : ''
											} ${props.class}`}
										>
											<item.icon />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}

						<Sidebar.MenuItem>
							<StorageUsageBar />
						</Sidebar.MenuItem>
					{/if}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props }: { props: MenuButtonProps })}
								<button
									onclick={() => setMode(mode.current === 'light' ? 'dark' : 'light')}
									{...props}
								>
									{#if mode.current === 'light'}
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
