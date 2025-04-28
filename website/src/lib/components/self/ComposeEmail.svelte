<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch';
	import type { EmailContentType } from '$lib/types/email';
	import { PUBLIC_DOMAIN } from '$env/static/public';
	import { USER_DATA } from '$lib/stores/user';

	let { isOpen } = $props<{ isOpen: boolean }>();

	let from = $state($USER_DATA!.username + '#' + PUBLIC_DOMAIN);
	let to = $state('');
	let subject = $state('');
	let body = $state('');
	let htmlMode = $state(false);
	let htmlBody = $state('');
	let status = $state('');
	let isStatusVisible = $state(false);
	let statusColor = $state<'default' | 'destructive'>('default');

	async function handleSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();

		const contentType: EmailContentType = htmlMode ? 'text/html' : 'text/plain';
		const emailData = {
			from,
			to,
			subject,
			body,
			content_type: contentType,
			html_body: htmlMode ? htmlBody : null
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

	function handleOpenChange(open: boolean) {
		isOpen = open;
		if (!open) {
			to = '';
			subject = '';
			body = '';
			htmlBody = '';
			isStatusVisible = false;
		}
	}
</script>

<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-3xl">
		<Dialog.Header class="space-y-4">
			<Dialog.Title>New Message</Dialog.Title>

			<div class="space-y-2 divide-y">
				<div class="flex items-center gap-4 py-2">
					<Label for="to" class="w-16">To:</Label>
					<Input
						id="to"
						type="text"
						bind:value={to}
						placeholder="recipient#domain"
						class="flex-1"
					/>
				</div>

				<div class="flex items-center gap-4 py-2">
					<Label for="subject" class="w-16">Subject:</Label>
					<Input
						id="subject"
						type="text"
						bind:value={subject}
						placeholder="Subject"
						class="flex-1"
					/>
				</div>

				<div class="relative pt-4">
					<div class="absolute right-0 top-4 flex items-center gap-2">
						<Label for="html-mode" class="text-muted-foreground text-sm">Rich text</Label>
						<Switch id="html-mode" bind:checked={htmlMode} />
					</div>

					{#if htmlMode}
						<Textarea
							id="html-body"
							bind:value={htmlBody}
							class="mt-8 min-h-[300px] font-mono"
							placeholder="<p>Write your message here...</p>"
						/>
					{:else}
						<Textarea
							id="body"
							bind:value={body}
							class="mt-8 min-h-[300px]"
							placeholder="Write your message here..."
						/>
					{/if}
				</div>
			</div>
		</Dialog.Header>

		<div class="mt-4 flex justify-between">
			<Button variant="outline" onclick={() => handleOpenChange(false)}>Cancel</Button>
			<Button type="submit" onclick={handleSubmit}>Send</Button>
		</div>

		{#if isStatusVisible}
			<Alert variant={statusColor} class="mt-4">
				<AlertDescription class="whitespace-pre-wrap">
					{status}
				</AlertDescription>
			</Alert>
		{/if}
	</Dialog.Content>
</Dialog.Root>
