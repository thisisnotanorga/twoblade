import { requireAuth } from "$lib/server/auth";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
    if (event.route.id?.startsWith('/(auth)')) {
        // Still return the user if they somehow land here while logged in
        // The (auth) layout will handle redirecting them away
        return { user: event.locals.user };
    }

    // For all other routes, require authentication
    const user = requireAuth(event);
    return { user };
};
