import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";

export function requireAuth(event: RequestEvent) {
    if (!event.locals.user) {
        throw redirect(303, '/login');
    }
    return event.locals.user;
}
