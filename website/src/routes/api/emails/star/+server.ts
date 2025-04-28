import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { emailId, starred } = await request.json();
    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    const email = await sql`
        SELECT id FROM emails 
        WHERE id = ${emailId}
        AND (to_address = ${userEmail} OR from_address = ${userEmail})
        LIMIT 1
    `;

    if (!email.length) {
        return new Response('Email not found', { status: 404 });
    }

    if (starred) {
        await sql`
            INSERT INTO email_stars (email_id, user_email)
            VALUES (${emailId}, ${userEmail})
            ON CONFLICT (email_id, user_email) DO NOTHING
        `;
    } else {
        await sql`
            DELETE FROM email_stars
            WHERE email_id = ${emailId}
            AND user_email = ${userEmail}
        `;
    }

    return json({ success: true });
};
