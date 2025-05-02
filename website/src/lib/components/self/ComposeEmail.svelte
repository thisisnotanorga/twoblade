<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch';
	import type { EmailContentType } from '$lib/types/email';
	import { PUBLIC_DOMAIN } from '$env/static/public';
	import { USER_DATA } from '$lib/stores/user';
	import { type DateValue, getLocalTimeZone } from '@internationalized/date';
	import DateTimePicker from './DateTimePicker.svelte';
	import type { Contact } from '$lib/types/contacts';
	import IconInput from '$lib/components/self/IconInput.svelte';
	import { Send, Mail, Tag, Clock, X } from 'lucide-svelte';
	import Autocomplete from '$lib/components/self/Autocomplete.svelte';

	let { isOpen = $bindable(), initialDraft = null } = $props<{
		isOpen: boolean;
		initialDraft?: any;
	}>();

	let from = $state($USER_DATA!.username + '#' + PUBLIC_DOMAIN);
	let to = $state('');
	let subject = $state('');
	let body = $state('');
	let htmlMode = $state(false);
	let htmlBody = $state('');
	let status = $state('');
	let isStatusVisible = $state(false);
	let statusColor = $state<'default' | 'destructive'>('default');
	let draftId = $state<number | null>(null);
	let autoSaveTimeout = $state<number | null>(null);
	let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let scheduledDate = $state<DateValue | undefined>();
	let suggestions = $state<Array<{ label: string; value: string; tag: string | null }>>([]);

	$effect(() => {
		if (initialDraft) {
			to = initialDraft.to_address || '';
			subject = initialDraft.subject || '';
			body = initialDraft.content_type === 'text/plain' ? initialDraft.body || '' : '';
			htmlBody = initialDraft.content_type === 'text/html' ? initialDraft.body || '' : '';
			htmlMode = initialDraft.content_type === 'text/html';
			draftId = initialDraft.id;
		}
	});

	async function saveDraft(content: {
		to: string;
		subject: string;
		body: string;
		contentType: string;
		htmlBody: string | null;
	}) {
		// only save if there's content
		if (!content.to && !content.subject && !content.body && !content.htmlBody) {
			return;
		}

		if (saveStatus === 'saving') return;
		saveStatus = 'saving';

		try {
			const isUpdate = draftId !== null;
			const method = isUpdate ? 'PUT' : 'POST';
			const draftPayload = {
				id: draftId, // include id for PUT requests
				to: content.to,
				subject: content.subject,
				body: content.body,
				contentType: content.contentType,
				htmlBody: content.htmlBody
			};

			console.log(`Saving draft (Method: ${method}):`, draftPayload);
			const response = await fetch('/api/drafts', {
				method: method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(draftPayload)
			});

			if (response.ok) {
				const { id } = await response.json();
				if (!isUpdate) {
					draftId = id; // store the new ID if it was a creation
				}
				saveStatus = 'saved';
			} else {
				console.error('Failed to save draft:', response.status, await response.text());
				saveStatus = 'idle';
			}
		} catch (error) {
			console.error('Failed to save draft:', error);
			saveStatus = 'idle';
		}
	}

	async function deleteDraft() {
		if (!draftId) return;

		try {
			await fetch('/api/drafts', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: draftId })
			});
		} catch (error) {
			console.error('Failed to delete draft:', error);
		}
	}

	function scheduleAutoSave() {
		if (autoSaveTimeout) window.clearTimeout(autoSaveTimeout);
		saveStatus = 'idle';

		const currentContent = {
			to,
			subject,
			body: htmlMode ? htmlBody : body,
			contentType: htmlMode ? 'text/html' : 'text/plain',
			htmlBody: htmlMode ? htmlBody : null
		};

		if (currentContent.body) {
			autoSaveTimeout = window.setTimeout(() => {
				saveDraft(currentContent);
			}, 1500);
		}
	}

	async function handleSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();

		const contentType: EmailContentType = htmlMode ? 'text/html' : 'text/plain';
		const emailData = {
			from,
			to,
			subject,
			body,
			content_type: contentType,
			html_body: htmlMode ? htmlBody : null,
			scheduled_at: scheduledDate ? scheduledDate.toDate(getLocalTimeZone()).toISOString() : null
		};
		isStatusVisible = true;
		status = 'Sending...';

		try {
			const response = await fetch('/api/mail', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(emailData)
			});

			const result = await response.json();

			if (response.ok) {
				status = `Email sent successfully!\n${JSON.stringify(result, null, 2)}`;
				statusColor = 'default';
				await deleteDraft();
			} else {
				status = `Error sending email:\n${result.message || response.statusText}`;
				statusColor = 'destructive';
			}
		} catch (error) {
			console.error('Fetch error:', error);
			status = `Failed to send email:\n${error}`;
			statusColor = 'destructive';
		}
	}

	async function handleSearch(query: string) {
		const response = await fetch(`/api/contacts?search=${query}`);
		if (response.ok) {
			const { contacts } = (await response.json()) as { contacts: Contact[] };
			suggestions = contacts.map((c) => ({
				label: `${c.full_name} <${c.email_address}>`,
				value: c.email_address,
				tag: c.tag
			}));
		} else {
			suggestions = [];
		}
	}

	function handleOpenChange(open: boolean) {
		if (!open && (to || subject || body || htmlBody)) {
			// save one last time before closing
			saveDraft({
				to,
				subject,
				body: htmlMode ? htmlBody : body,
				contentType: htmlMode ? 'text/html' : 'text/plain',
				htmlBody: htmlMode ? htmlBody : null
			});
		}
		if (!open) {
			// reset state when dialog closes
			to = '';
			subject = '';
			body = '';
			htmlBody = '';
			htmlMode = false;
			isStatusVisible = false;
			draftId = null;
			saveStatus = 'idle';
			scheduledDate = undefined;
			if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
		}
	}
</script>

<Dialog.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[700px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl">New Message</Dialog.Title>
			<Dialog.Description class="text-muted-foreground">
				Compose your email message below.
			</Dialog.Description>
		</Dialog.Header>

		<form class="space-y-4 pt-4">
			<div class="space-y-4">
				<div class="flex items-center gap-4">
					<label for="to" class="w-20 text-sm font-medium">To:</label>
					<div class="flex-1">
						<Autocomplete
							id="to"
							icon={Mail}
							bind:value={to}
							{suggestions}
							placeholder="recipient#domain"
							onsearch={handleSearch}
						/>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<label for="subject" class="w-20 text-sm font-medium">Subject:</label>
					<div class="flex-1">
						<IconInput
							id="subject"
							icon={Tag}
							type="text"
							bind:value={subject}
							placeholder="Subject"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<label for="html-mode" class="text-sm font-medium">Message:</label>
						<div class="flex items-center gap-2">
							<Label for="html-mode" class="text-muted-foreground text-sm">Rich text</Label>
							<Switch id="html-mode" bind:checked={htmlMode} />
						</div>
					</div>

					{#if htmlMode}
						<Textarea
							id="html-body"
							bind:value={htmlBody}
							oninput={scheduleAutoSave}
							class="min-h-[300px] font-mono"
							placeholder="<p>Write your message here...</p>"
						/>
					{:else}
						<Textarea
							id="body"
							bind:value={body}
							oninput={scheduleAutoSave}
							class="min-h-[300px]"
							placeholder="Write your message here..."
						/>
					{/if}
				</div>
			</div>

			<Dialog.Footer class="flex items-center justify-end gap-4">
				<button type="button" class="mr-auto text-sm underline" onclick={() => (isOpen = false)}>
					Cancel
				</button>
				<DateTimePicker date={scheduledDate} onChange={(date) => (scheduledDate = date)} />
				<Button onclick={handleSubmit}>
					{#if scheduledDate}
						<Clock class="h-4 w-4" />
						Schedule
					{:else}
						<Send class="h-4 w-4" />
						Send
					{/if}
				</Button>
			</Dialog.Footer>

			{#if isStatusVisible}
				<Alert variant={statusColor} class="mt-4">
					<AlertDescription class="whitespace-pre-wrap">
						{status}
					</AlertDescription>
				</Alert>
			{/if}
		</form>
	</Dialog.Content>
</Dialog.Root>
