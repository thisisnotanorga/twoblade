import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ url }) => {
    if (url.pathname === '/') {
        throw redirect(307, '/index');
    }

    const emails = await sql`
        SELECT * FROM emails 
        ORDER BY sent_at DESC 
        LIMIT 100
    `;

    return {
        emails
    };
};