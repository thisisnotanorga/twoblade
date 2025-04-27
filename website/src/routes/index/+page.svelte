<script lang="ts">
	import type { PageData } from './$types';
	import { Square, CheckSquare } from 'lucide-svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { scale } from 'svelte/transition';
	import Star from '$lib/components/self/icons/Star.svelte';
	import EmailViewer from '$lib/components/self/EmailViewer.svelte';
	import type { Email } from '$lib/types/email';
	import * as Resizable from '$lib/components/ui/resizable/index.js';

	interface Props {
		data: { emails: Email[] } & PageData;
	}

	let { data }: Props = $props();

	let multipliedEmails = $derived(
		[...Array(10)].flatMap(
			() =>
				data.emails.map((email) => ({
					...email,
					id: `${email.id}-${Math.random()}`
				})) as Email[]
		)
	);

	let selectedEmail: Email | null = $state(null);
	let selectedEmails = $state<Set<string>>(new Set());
	let starredEmails = $state<Set<string>>(new Set());

		$effect(() => {
			console.log(selectedEmail)
		})
	function formatDate(date: string) {
		return new Date(date).toLocaleString([], {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function toggleSelect(emailId: string) {
		const newSet = new Set(selectedEmails);
		if (newSet.has(emailId)) newSet.delete(emailId);
		else newSet.add(emailId);
		selectedEmails = newSet;
	}

	function toggleStar(emailId: string) {
		const newSet = new Set(starredEmails);
		if (newSet.has(emailId)) newSet.delete(emailId);
		else newSet.add(emailId);
		starredEmails = newSet;
	}

	function handleKeyDown(event: KeyboardEvent, email: Email) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectedEmail = email;
		}
	}
</script>

<div class="h-[calc(100vh-6rem)] w-full">
	<Resizable.PaneGroup direction="horizontal">
		<Resizable.Pane minSize={25} maxSize={80}>
			<ScrollArea class="h-full w-full">
				<div class="flex flex-col gap-1 px-4 py-4 md:px-6">
					{#each multipliedEmails as email (email.id)}
						<button
							type="button"
							class={`hover:bg-accent hover:text-accent-foreground flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
								selectedEmails.has(email.id) ? 'bg-accent text-accent-foreground' : ''
							} ${selectedEmail?.id === email.id ? 'bg-accent text-accent-foreground' : ''}`}
							aria-label={`Email from ${email.from_address} with subject ${email.subject}`}
							onclick={() => (selectedEmail = email)}
							onkeydown={(e) => handleKeyDown(e, email)}
						>
							<div class="flex w-full items-center">
								<div class="flex items-center space-x-1">
									<span
										class="hover:bg-primary/10 group rounded-full p-1.5 transition-colors"
										role="checkbox"
										aria-checked={selectedEmails.has(email.id)}
										tabindex="0"
										onclick={(e) => {
											e.stopPropagation();
											toggleSelect(email.id);
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												e.stopPropagation();
												toggleSelect(email.id);
											}
										}}
									>
										{#if selectedEmails.has(email.id)}
											<div in:scale|fade={{ duration: 150 }}>
												<CheckSquare class="text-primary h-5 w-5" />
											</div>
										{:else}
											<div in:scale|fade={{ duration: 150 }}>
												<Square class="group-hover:text-primary h-5 w-5 text-gray-400" />
											</div>
										{/if}
									</span>
									<span
										class="group rounded-full p-1.5 transition-colors ease-in-out hover:bg-yellow-400/10"
										role="button"
										aria-pressed={starredEmails.has(email.id)}
										tabindex="0"
										onclick={(e) => {
											e.stopPropagation();
											toggleStar(email.id);
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												e.stopPropagation();
												toggleStar(email.id);
											}
										}}
									>
										{#if starredEmails.has(email.id)}
											<div in:scale|fade={{ duration: 150 }}>
												<Star class="h-5 w-5 text-yellow-500" filled={true} />
											</div>
										{:else}
											<div in:scale|fade={{ duration: 150 }}>
												<Star class="group-hover:text-red-40 h-5 w-5 text-gray-400" />
											</div>
										{/if}
									</span>
								</div>
								<div class="ml-3 flex flex-1 items-center space-x-3 min-w-0">
                                    <span class="max-w-[200px] truncate font-medium">
                                        {email.from_address}
                                    </span>
                                    <div class="flex-1 truncate">
                                        <span class="mr-1">{email.subject}</span>
                                        <span class="text-muted-foreground">- {email.body}</span>
                                    </div>
                                    <span class="flex-shrink-0 whitespace-nowrap text-xs/snug">
                                        {formatDate(email.sent_at)}
                                    </span>
                                </div>
							</div>
						</button>
					{/each}
				</div>
			</ScrollArea>
		</Resizable.Pane>

		{#if selectedEmail}
			<Resizable.Handle withHandle />
			<Resizable.Pane>
				<div class="h-full border-l">
					<EmailViewer email={selectedEmail} onClose={() => (selectedEmail = null)} />
				</div>
			</Resizable.Pane>
		{/if}
	</Resizable.PaneGroup>
</div>

<style>
	:global(html) {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	:global(html::-webkit-scrollbar) {
		display: none;
	}
</style>
