import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcrypt';
import type { Actions, ActionData } from './$types';
import { sql } from '$lib/server/db';
import { PUBLIC_DOMAIN } from '$env/static/public';

const SALT_ROUNDS = 10;

export const actions: Actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const username = data.get('username');
        const password = data.get('password');
        const confirmPassword = data.get('confirmPassword');

        if (
            !username ||
            typeof username !== 'string' ||
            !password ||
            typeof password !== 'string' ||
            username.length < 3
        ) {
            return fail(400, { error: 'Invalid input.', username });
        }

        if (password.length < 8) {
            return fail(400, { error: 'Password must be at least 8 characters.', username });
        }

        if (password !== confirmPassword) {
            return fail(400, { error: 'Passwords do not match.', username });
        }

        try {
            const existingUsers = await sql`
                SELECT id FROM users WHERE username = ${username}
            `;

            if (existingUsers.length > 0) {
                return fail(409, { error: 'Username already taken.', username }); // 409 Conflict
            }

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            await sql`
                INSERT INTO users (username, password_hash, domain)
                VALUES (${username}, ${passwordHash}, ${PUBLIC_DOMAIN})
            `;

            return { success: true };

        } catch (error) {
            console.error('Signup error:', error);
            return fail(500, { error: 'Internal server error. Please try again later.', username });
        }
    }
};

export type { ActionData };