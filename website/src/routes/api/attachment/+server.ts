import { json, error, redirect, type HttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { nanoid } from 'nanoid';
import { generatePresignedUrl, generateDownloadUrl } from '$lib/s3';
import { sql } from '$lib/db';

export const POST: RequestHandler = async ({ request }) => {
    const { filename, size, type } = await request.json();

    if (!filename || !size || !type) {
        return json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (size > 25 * 1024 * 1024) { // 25MB
        return json({ error: 'File too large' }, { status: 400 });
    }

    const key = `attachments/${nanoid()}-${filename}`;

    await sql
        `INSERT INTO attachments (key, filename, size, type) 
         VALUES (${key}, ${filename}, ${size}, ${type})`;

    const uploadUrl = await generatePresignedUrl(key, type);

    return json({ uploadUrl, key });
};

export const GET: RequestHandler = async ({ url }) => {
    const key = url.searchParams.get('key');

    if (!key) {
        throw error(400, 'Missing key parameter');
    }

    try {
        const attachment = await sql`
            SELECT * FROM attachments 
            WHERE key = ${key} 
            AND expires_at > NOW()
        `;

        if (!attachment?.length) {
            console.error('Attachment not found in database or expired:', key);
            throw error(404, 'Attachment not found or expired');
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