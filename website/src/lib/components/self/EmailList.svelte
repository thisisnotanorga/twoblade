<script lang="ts">
	import { Square, CheckSquare, Calendar } from 'lucide-svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { scale } from 'svelte/transition';
	import Star from '$lib/components/self/icons/Star.svelte';
	import EmailViewer from '$lib/components/self/EmailViewer.svelte';
	import type { Email } from '$lib/types/email';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import SnoozeButton from './SnoozeButton.svelte';
	import UnsnoozeButton from './UnsnoozeButton.svelte';
	import TimeUntil from '$lib/components/self/TimeUntil.svelte';
	import { toast } from 'svelte-sonner';
	import { USER_DATA } from '$lib/stores/user';

	let props = $props<{
		emails: Email[];
		showStatus?: boolean;
		showUnsnooze?: boolean;
		showRecipient?: boolean;
	}>();

	let { emails: initialEmails, showStatus = false, showUnsnooze = false, showRecipient = false } = props;
	let emails = $state(initialEmails);

	let selectedEmail: Email | null = $state(null);
	let selectedEmails = $state<Set<string>>(new Set());
	let starredEmails = $state<Set<string>>(new Set());

	let isReceiver = $derived((email: Email) => 
		email.to_address === $USER_DATA?.username + '#' + $USER_DATA?.domain
	);

	$effect(() => {
		console.log(selectedEmail);
	});
	function formatDate(date: string) {
		return new Date(date).toLocaleString([], {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatScheduledDate(date: string) {
		const scheduledDate = new Date(date);

		return `${scheduledDate.toLocaleString([], {
			dateStyle: 'medium',
			timeStyle: 'short'
		})}`;
	}

	function toggleSelect(emailId: string) {
		const newSet = new Set(selectedEmails);
		if (newSet.has(emailId)) newSet.delete(emailId);
		else newSet.add(emailId);
		selectedEmails = newSet;
	}

	async function toggleStar(emailId: string) {
		const email = emails.find((e: Email) => e.id === emailId);
		if (!email) return;

		try {
			const response = await fetch('/api/emails/star', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					emailId,
					starred: !email.starred
				})
			});

			if (response.ok) {
				emails = emails.map((e: Email) => (e.id === emailId ? { ...e, starred: !e.starred } : e));

				const newSet = new Set(starredEmails);
				if (email.starred) {
					newSet.delete(emailId);
				} else {
					newSet.add(emailId);
				}
				starredEmails = newSet;
			}
		} catch (error) {
			toast.error('Failed to update star status');
		}
	}

	async function handleEmailSelect(email: Email) {
		if (isReceiver(email) && !email.read_at) {
			try {
				const response = await fetch('/api/emails/read', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ emailId: email.id })
				});

				if (response.ok) {
					// update the email's read status in our local state
					emails = emails.map((e: Email) => 
						e.id === email.id 
							? { ...e, read_at: new Date().toISOString() }
							: e
					);
				}
			} catch (error) {
				console.error('Failed to mark email as read:', error);
			}
		}
		selectedEmail = email;
	}

	function handleKeyDown(event: KeyboardEvent, email: Email) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectedEmail = email;
		}
	}

	function handleActionComplete(ids: string[]) {
		const idsSet = new Set(ids);
		emails = emails.filter((email: Email) => !idsSet.has(email.id));
		selectedEmails = new Set();
	}

	$effect(() => {
		emails = initialEmails;
	});

	$effect(() => {
		starredEmails = new Set(emails.filter((e: Email) => e.starred).map((e: Email) => e.id));
	});
</script>

<div class="h-[calc(100vh-6rem)] w-full">
	{#if selectedEmails.size > 0}
		<div
			class="bg-background/95 supports-[backdrop-filter]:bg-background/60 flex items-center gap-2 border-b p-2 backdrop-blur"
		>
			<span class="text-muted-foreground text-sm">
				{selectedEmails.size} selected
			</span>
			{#if showUnsnooze}
				<UnsnoozeButton {selectedEmails} onUnsnooze={handleActionComplete} />
			{:else}
				<SnoozeButton {selectedEmails} onSnooze={handleActionComplete} />
			{/if}
		</div>
	{/if}
	<Resizable.PaneGroup direction="horizontal">
		<Resizable.Pane minSize={25} maxSize={80}>
			<ScrollArea class="h-full w-full">
				<div class="flex flex-col gap-1 px-4 py-4 md:px-6">
					{#if emails.length === 0}
						<div class="text-muted-foreground flex h-32 items-center justify-center">
							<p>No emails</p>
						</div>
					{:else}
						{#each emails as email (email.id)}
							<button
								type="button"
								class={`hover:bg-accent hover:text-accent-foreground flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
									selectedEmails.has(email.id) ? 'bg-accent text-accent-foreground' : ''
								} ${selectedEmail?.id === email.id ? 'bg-accent text-accent-foreground' : ''}`}
								aria-label={`Email from ${email.from_address} with subject ${email.subject}`}
								onclick={() => handleEmailSelect(email)}
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
									<div class="ml-3 flex min-w-0 flex-1 items-center space-x-3">
										<span class="max-w-[200px] truncate font-medium {isReceiver(email) && !email.read_at ? 'font-bold' : ''}">
												{showRecipient ? email.to_address : email.from_address}
										</span>
										<div class="flex-1 truncate">
											<span class="mr-1 {isReceiver(email) && !email.read_at ? 'font-bold' : ''}">{email.subject}</span>
											<span class="text-muted-foreground">- {email.body}</span>
										</div>
										<span class="flex-shrink-0 whitespace-nowrap text-xs/snug">
											{formatDate(email.sent_at)}
										</span>
									</div>
								</div>
								{#if email.snooze_until && new Date(email.snooze_until) > new Date()}
									<TimeUntil date={email.snooze_until} />
								{/if}
								{#if showStatus && email.status}
									<div class="flex items-center gap-2">
										{#if email.status === 'sent'}
											<span
												class="bg-primary/10 text-primary inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
											>
												Sent
											</span>
										{:else if email.status === 'sending' || email.status === 'pending'}
											<span
												class="bg-accent/10 text-accent-foreground inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
											>
												{email.status === 'sending' ? 'Sending...' : 'Pending'}
											</span>
										{:else if email.status === 'scheduled'}
											<span
												class="bg-accent/10 text-accent-foreground inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
											>
												Scheduled
											</span>
											{#if email.scheduled_at}
												<span class="text-muted-foreground text-xs italic">
													(scheduled for {formatScheduledDate(email.scheduled_at)})
												</span>
											{/if}
										{:else}
											<span
												class="bg-destructive/10 text-destructive inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
											>
												{email.status === 'failed' ? 'Failed' : 'Rejected'}
											</span>
											{#if email.error_message}
												<span class="text-destructive/80 text-xs italic">
													({email.error_message})
												</span>
											{/if}
										{/if}
									</div>
								{/if}
							</button>
						{/each}
					{/if}
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
