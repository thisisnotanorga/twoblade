import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    const userEmail = `${locals.user.username}@${locals.user.domain}`;

    const emails = await sql`
        SELECT * FROM emails 
        WHERE from_address = ${userEmail} OR to_address = ${userEmail}
        ORDER BY sent_at DESC 
        LIMIT 100
    `;

    return {
        emails
    };
};