<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import type { EmailContentType } from '$lib/types/email';
	import { PUBLIC_DOMAIN } from '$env/static/public';

	let from = $state('admin#' + PUBLIC_DOMAIN);
	let to = $state('admin#2.tcp.eu.ngrok.io:12802');
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
</script>

<Card class="mx-auto mt-6 w-full max-w-2xl">
	<CardHeader>
		<CardTitle>Compose SHARP Email</CardTitle>
	</CardHeader>
	<CardContent>
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="from">From (Your SHARP Address)</Label>
				<Input
					id="from"
					type="text"
					bind:value={from}
					placeholder="user#domain.com"
					class="w-full"
				/>
				<Label for="to">To (Recipient's SHARP Address)</Label>
				<Input id="to" type="text" bind:value={to} placeholder="me#localhost:5000" class="w-full" />
				<Label for="subject">Subject</Label>
				<Input
					id="subject"
					type="text"
					bind:value={subject}
					placeholder="Email Subject"
					class="w-full"
				/>

				<div class="flex items-center space-x-2 py-2">
					<Switch id="html-mode" bind:checked={htmlMode} />
					<Label for="html-mode">Enable HTML Mode</Label>
				</div>

				{#if htmlMode}
					<Label for="html-body">HTML Content</Label>
					<Textarea 
						id="html-body" 
						bind:value={htmlBody} 
						class="min-h-[150px] font-mono" 
						placeholder="<p>Your HTML content here</p>"
					/>
					<div class="text-sm text-muted-foreground">
						Plain text will be used as fallback for clients that don't support HTML.
					</div>
				{:else}
					<Label for="body">Body</Label>
					<Textarea id="body" bind:value={body} class="min-h-[150px]" />
				{/if}
			</div>

			<Button type="submit" class="w-full">Send SHARP Email</Button>
		</form>

		{#if isStatusVisible}
			<Alert variant={statusColor} class="mt-4">
				<AlertDescription class="whitespace-pre-wrap">
					{status}
				</AlertDescription>
			</Alert>
		{/if}
	</CardContent>
</Card>
