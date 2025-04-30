import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    let body;
    let emailId: string;

    try {
        body = await request.json();

        if (!body || typeof body !== 'object') {
            throw new Error('Invalid request body format');
        }

        emailId = body.emailId;
        if (!emailId || (typeof emailId !== 'string' && typeof emailId !== 'number')) {
            throw new Error(`Missing or invalid emailId: ${emailId}`);
        }

        emailId = emailId.toString();
    } catch (err) {
        console.error("Error parsing request body:", err, "Raw body:", body);
        throw error(400, 'Invalid request body');
    }

    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    try {
        const result = await sql`
            UPDATE emails 
            SET read_at = CURRENT_TIMESTAMP 
            WHERE (
                id = ${emailId}
                OR thread_id = ${emailId}
                OR thread_id = (SELECT thread_id FROM emails WHERE id = ${emailId})
            )
            AND to_address = ${userEmail} 
            AND read_at IS NULL
            RETURNING id;
        `;

        return json({
            success: true,
            updated: result.count > 0
        });

    } catch (dbError) {
        console.error("Database error marking email as read:", dbError);
        throw error(500, 'Failed to mark email as read');
    }
};