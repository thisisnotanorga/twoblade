import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { emailId } = await request.json();
    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    const email = await sql`
        SELECT id FROM emails 
        WHERE id = ${emailId}
        AND to_address = ${userEmail}
        AND read_at IS NULL
        LIMIT 1
    `;

    if (!email.length) {
        return new Response('Email not found or already read', { status: 404 });
    }

    await sql`
        UPDATE emails 
        SET read_at = CURRENT_TIMESTAMP 
        WHERE id = ${emailId}
    `;

    return json({ success: true });
};
