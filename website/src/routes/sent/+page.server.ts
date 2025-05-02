import { redirect } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { PageServerLoad } from '../$types';
import type { Email } from '$lib/types/email';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    const emails: Email[] = await sql`
        SELECT e.*, EXISTS(
            SELECT 1 FROM email_stars es 
            WHERE es.email_id = e.id 
            AND es.user_email = ${userEmail}
        ) as starred,
        CASE 
            WHEN scheduled_at > CURRENT_TIMESTAMP THEN scheduled_at
            ELSE NULL
        END as effective_scheduled_at
        FROM emails e 
        WHERE from_address = ${userEmail}
        ORDER BY 
            CASE WHEN status = 'pending' AND scheduled_at > CURRENT_TIMESTAMP 
                THEN scheduled_at
                ELSE sent_at
            END DESC 
        LIMIT 100
    `;

    return { emails };
};
