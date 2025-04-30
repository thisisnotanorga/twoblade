import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';
import type { Email } from '$lib/types/email';

export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const threadIdParam = url.searchParams.get('id');

    if (!threadIdParam) {
        throw error(400, 'Thread ID required');
    }

    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    try {
        const emails: Email[] = await sql`
            SELECT 
                e.*, 
                EXISTS(
                    SELECT 1 FROM email_stars es 
                    WHERE es.email_id = e.id 
                    AND es.user_email = ${userEmail}
                ) as starred
            FROM emails e 
            WHERE (e.thread_id::text = ${threadIdParam} OR e.id::text = ${threadIdParam})
              AND (e.to_address = ${userEmail} OR e.from_address = ${userEmail})
              AND e.status = 'sent' -- Only show sent emails in thread view
              AND (e.snooze_until IS NULL OR e.snooze_until <= CURRENT_TIMESTAMP)
              AND (e.scheduled_at IS NULL OR e.scheduled_at <= CURRENT_TIMESTAMP)
            ORDER BY e.sent_at ASC;
        `;

        return json({ emails });
    } catch (dbError) {
        console.error(`Database error fetching thread emails for ID ${threadIdParam}:`, dbError);
        throw error(500, 'Failed to fetch email thread');
    }
};