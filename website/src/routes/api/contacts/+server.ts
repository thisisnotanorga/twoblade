import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userEmail = `${locals.user.username}#${locals.user.domain}`;
    const search = url.searchParams.get('search');

    const contacts = await sql`
        SELECT c.*, array_agg(ct.tag) as tags
        FROM contacts c
        LEFT JOIN contact_tags ct ON c.id = ct.contact_id
        WHERE c.user_email = ${userEmail}
        ${search ? sql`AND (
            c.full_name ILIKE ${`%${search}%`} OR 
            c.email_address ILIKE ${`%${search}%`} OR 
            c.tag ILIKE ${`%${search}%`}
        )` : sql``}
        GROUP BY c.id
        ORDER BY c.full_name ASC
    `;

    return json({ contacts });
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const contact = await request.json();
    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    try {
        const result = await sql`
            INSERT INTO contacts (user_email, full_name, email_address, tag)
            VALUES (${userEmail}, ${contact.fullName}, ${contact.email}, ${contact.tag})
            RETURNING id
        `;

        return json({ id: result[0].id });
    } catch (error) {
        if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
            return json({ error: 'Contact with this email already exists' }, { status: 400 });
        }
        throw error;
    }
};

export const PUT: RequestHandler = async ({ request, locals, url }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const contact = await request.json();
    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing contact ID', { status: 400 });
    
    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    try {
        await sql`
            UPDATE contacts 
            SET 
                full_name = ${contact.fullName}, 
                email_address = ${contact.email}, 
                tag = ${contact.tag},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id} 
            AND user_email = ${userEmail}
        `;

        return json({ success: true });
    } catch (error) {
        console.error('Failed to update contact:', error);
        return json({ error: 'Failed to update contact' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing contact ID', { status: 400 });
    
    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    try {
        await sql`
            DELETE FROM contacts 
            WHERE id = ${id} 
            AND user_email = ${userEmail}
        `;

        return json({ success: true });
    } catch (error) {
        console.error('Failed to delete contact:', error);
        return json({ error: 'Failed to delete contact' }, { status: 500 });
    }
};