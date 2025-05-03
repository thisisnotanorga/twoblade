import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { sql } from '$lib/server/db';

export async function GET({ locals }: RequestEvent) {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const settings = await sql`
        SELECT notifications_enabled 
        FROM user_settings 
        WHERE user_id = ${locals.user.id}
    `;

    return json(settings[0] || { notifications_enabled: false });
}

export async function POST({ request, locals }: RequestEvent) {
    if (!locals.user) {
        throw error(401, 'Unauthorized');
    }

    const settings = await request.json();

    await sql`
        INSERT INTO user_settings (user_id, notifications_enabled)
        VALUES (${locals.user.id}, ${settings.notifications_enabled})
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            notifications_enabled = ${settings.notifications_enabled},
            updated_at = CURRENT_TIMESTAMP
    `;

    return json({ success: true });
}
