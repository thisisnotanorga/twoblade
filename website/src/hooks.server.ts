import { sql } from "$lib/server/db";
import { deleteCode, verifyAuthJWT } from "$lib/server/jwt";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
    const token = event.cookies.get('auth_token');
    event.locals.user = null;

    if (token) {
        const payload = await verifyAuthJWT(token);
        if (payload) {
            try {
                const users = await sql`
                    SELECT id, username, domain, is_banned, created_at, iq, deleted_at, is_admin
                    FROM users
                    WHERE id = ${payload.userId} AND is_banned = FALSE
                `;

                const rawUser = users[0];

                if (rawUser && !rawUser.deleted_at) {
                    event.locals.user = {
                        id: rawUser.id as number,
                        username: rawUser.username as string,
                        domain: rawUser.domain as string,
                        is_banned: rawUser.is_banned as boolean,
                        created_at: rawUser.created_at instanceof Date ? rawUser.created_at.toISOString() : String(rawUser.created_at),
                        iq: rawUser.iq,
                        is_admin: rawUser.is_admin,
                    };
                } else {
                    await deleteCode(payload.code);
                    event.cookies.delete('auth_token', { path: '/' });
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                event.cookies.delete('auth_token', { path: '/' });
            }
        } else {
            event.cookies.delete('auth_token', { path: '/' });
        }
    }

    return await resolve(event);
};