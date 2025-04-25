<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';

	let from = $state('me#twoblade.com');
	let to = $state('me#localhost:5000');
	let subject = $state('');
	let body = $state('');
	let status = $state('');
	let isStatusVisible = $state(false);
	let statusColor = $state<'default' | 'destructive'>('default');

	async function handleSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();

        const sharpAddressRegex = /^[a-zA-Z0-9._%+-]+#(?:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|localhost(?::\d+)?|(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?)$/;
        if (!sharpAddressRegex.test(from) || !sharpAddressRegex.test(to)) {
            status = 'Invalid SHARP address format. Use user#domain.com, user#localhost:port, or user#ip:port';
            statusColor = 'destructive';
            isStatusVisible = true;
            return;
        }

		const emailData = { from, to, subject, body };
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

				<Label for="body">Body</Label>
				<Textarea id="body" bind:value={body} class="min-h-[150px]" />
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
