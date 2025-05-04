import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';

export async function GET({ params }) {
    try {
        const users = await sql`
            SELECT iq
            FROM users
            WHERE username = ${params.username}
        `;

        if (users.length === 0) {
            return json({ iq: null });
        }

        return json({ iq: users[0].iq });
    } catch (error) {
        console.error('Error fetching user IQ:', error);
        return json({ iq: null }, { status: 500 });
    }
}
