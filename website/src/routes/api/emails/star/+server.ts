import { json } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { emailId, starred } = await request.json();
    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    await sql`
        UPDATE emails 
        SET starred = ${starred}
        WHERE id = ${emailId}
        AND (to_address = ${userEmail} OR from_address = ${userEmail})
    `;

    return json({ success: true });
};
