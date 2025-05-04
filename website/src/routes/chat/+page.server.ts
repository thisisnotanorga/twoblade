import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, parent }) => {
    const { user } = await parent();
    if (!user) {
        throw error(401, 'Unauthorized');
    }

    const token = cookies.get('auth_token');
    if (!token) {
        throw error(401, 'No auth token found');
    }

    return {
        token
    };
};
