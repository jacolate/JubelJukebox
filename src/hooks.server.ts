import { lucia } from "$lib/server/auth";
import type { Handle } from "@sveltejs/kit";
import { building } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
    if (!building) {
        const sessionId = event.cookies.get(lucia.sessionCookieName);
        if (!sessionId) {
            event.locals.user = null;
            event.locals.session = null;
            return resolve(event);
        }

        const { session, user } = await lucia.validateSession(sessionId);
        console.log("SESSION", session);
        if (session && session.fresh) {
            const sessionCookie = lucia.createSessionCookie(session.id);
            event.cookies.set(sessionCookie.name, sessionCookie.value, {
                path: ".",
                ...sessionCookie.attributes
            });
        }
        if (!session) {
            const sessionCookie = lucia.createBlankSessionCookie();
            event.cookies.set(sessionCookie.name, sessionCookie.value, {
                path: ".",
                ...sessionCookie.attributes
            });
        }
        event.locals.user = user;
        event.locals.session = session;
    }
    return resolve(event);
};
