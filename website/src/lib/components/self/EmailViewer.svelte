<script lang="ts">
    import { X } from 'lucide-svelte';
    import type { Email } from '$lib/types/email';

    let { email, onClose } = $props<{
        email: Email | null;
        onClose: () => void;
    }>();
</script>

{#if email}
    <div class="flex h-[calc(100vh-6rem)] flex-col bg-background p-6">
        <div class="mb-6 flex items-center justify-between">
            <h2 class="text-2xl font-bold">{email.subject}</h2>
            <button 
                onclick={onClose}
                class="rounded-full p-2 hover:bg-accent"
                aria-label="Close email"
            >
                <X class="h-5 w-5" />
            </button>
        </div>
        
        <div class="mb-4">
            <div class="text-sm text-muted-foreground">From:</div>
            <div class="font-medium">{email.from_address}</div>
        </div>

        <div class="mb-6">
            <div class="text-sm text-muted-foreground">Sent:</div>
            <div>{new Date(email.sent_at).toLocaleString()}</div>
        </div>

        <div class="prose dark:prose-invert max-w-none flex-1">
            <p>{email.body}</p>
        </div>
    </div>
{:else}
    <div class="flex h-full items-center justify-center text-muted-foreground">
        Select an email to view its contents
    </div>
{/if}
