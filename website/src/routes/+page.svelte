<script lang="ts">
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
    import type { PageData } from './$types';

    export let data: PageData;

    function formatDate(date: string) {
        return new Date(date).toLocaleString();
    }
</script>

<div class="container mx-auto py-10">
    <h1 class="text-3xl font-bold mb-6">Email History</h1>

    <Table>
        <TableHeader>
            <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {#each data.emails as email}
                <TableRow>
                    <TableCell>{email.from_address}</TableCell>
                    <TableCell>{email.to_address}</TableCell>
                    <TableCell>{email.subject}</TableCell>
                    <TableCell>
                        <span class={email.status === 'delivered' ? 'text-green-600' : 
                                  email.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}>
                            {email.status}
                        </span>
                    </TableCell>
                    <TableCell>{formatDate(email.sent_at)}</TableCell>
                </TableRow>
            {/each}
        </TableBody>
    </Table>
</div>