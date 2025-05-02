import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateDownloadUrl, generatePresignedUrl } from '$lib/s3';
import { sql } from '$lib/db';
import { nanoid } from 'nanoid';
import { ALLOWED_TYPES } from '$lib/types/attachment';

const ONE_GB = 1024 * 1024 * 1024; // 1GB in bytes

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { filename, size, type } = await request.json();

    if (!filename || !size || !type) {
        return json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (size > 25 * 1024 * 1024) { // 25MB
        return json({ error: 'File too large' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(type)) {
        return json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Check user's storage limit
    const [currentUsage] = await sql`
        SELECT calculate_user_storage(${locals.user.id}) as usage
    `;

    const usage = Number(currentUsage?.usage || 0);
    
    if (usage + size > ONE_GB) {
        return json({ 
            error: 'Storage limit exceeded', 
            usage,
            limit: ONE_GB,
            available: ONE_GB - usage 
        }, { status: 400 });
    }

    const key = `attachments/${nanoid()}-${filename}`;

    await sql
        `INSERT INTO attachments (key, filename, size, type) 
         VALUES (${key}, ${filename}, ${size}, ${type})`;

    const uploadUrl = await generatePresignedUrl(key, type);

    return json({ uploadUrl, key });
};

export const GET: RequestHandler = async ({ locals, url }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const key = url.searchParams.get('key');
    const userEmail = `${locals.user.username}#${locals.user.domain}`;

    if (!key) {
        throw error(400, 'Missing key parameter');
    }

    try {
        const attachment = await sql`
            SELECT a.* 
            FROM attachments a
            JOIN emails e ON a.email_id = e.id
            WHERE a.key = ${key}
            AND a.expires_at > NOW()
            AND (
                e.from_address = ${userEmail} OR 
                e.to_address = ${userEmail}
            )
        `;

        if (!attachment?.length) {
            console.error('Attachment not found or user not authorized:', key);
            throw error(404, 'Attachment not found or access denied');
        }

        const signedUrl = await generateDownloadUrl(key);
        throw redirect(302, signedUrl);

    } catch (err) {
        if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') {
            if (err.status >= 300 && err.status < 400) {
                throw err;
            }
            if (err.status >= 400) {
                throw err;
            }
        }

        console.error('Unexpected attachment fetch error:', err);
        throw error(500, 'Failed to process attachment request');
    }
};
