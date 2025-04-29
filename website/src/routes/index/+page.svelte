<script lang="ts">
	import EmailList from '$lib/components/self/EmailList.svelte';
	import type { Email } from '$lib/types/email';
	import { classificationStore } from '$lib/stores/classificationStore.svelte.js';

	let { data } = $props();
	let currentTab = $derived(classificationStore.currentTab);
	
	let filteredEmails = $derived(
		data.emails.filter((email: Email) => email.classification === currentTab)
	);

	$effect(() => {
		console.log('Current tab:', currentTab);
		console.log('Filtered emails:', filteredEmails);
	});
</script>

<EmailList emails={filteredEmails} />
