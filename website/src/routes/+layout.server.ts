import { requireAuth } from "$lib/auth";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
    try {
        if (event.route.id?.startsWith('/(auth)')) {
            return { user: event.locals.user };
        }

        const user = requireAuth(event);
        return { user };
    } catch (error) {
        return {
            user: null,
            offline: true
        };
    }
};
