import { sql } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const emails = await sql`
        SELECT * FROM emails 
        ORDER BY sent_at DESC 
        LIMIT 100
    `;

    return {
        emails
    };
};