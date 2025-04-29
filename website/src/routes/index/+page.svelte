<script lang="ts">
	import EmailList from '$lib/components/self/EmailList.svelte';
	import type { Email, EmailClassification } from '$lib/types/email';
	import { classificationStore } from '$lib/stores/classificationStore.svelte.js';

	let { data } = $props();

	let filteredEmails = $derived(
		data.emails.filter((email: Email) => email.classification === classificationStore.currentTab)
	);
</script>

<EmailList emails={filteredEmails} />
