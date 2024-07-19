import { lucia, verifyCode } from "$lib/server/auth";
import { fail, redirect } from "@sveltejs/kit";
import { generateId } from "lucia";
import { db } from "$lib/server/db";

import type { Actions, PageServerLoad } from "./$types";


export const load: PageServerLoad = async (event) => {
    if (event.locals.user) {
        return redirect(302, "/");
    }
    return {};
};

export const actions: Actions = {
    default: async (event) => {
        const formData = await event.request.formData();
        const username = formData.get("username");
        const code = formData.get("code");
        console.log("HALLLLLLO", username, code);

        console.log("VOR VALI");

        if (!await verifyCode(code)) {
            console.log("Invalid code");
            return fail(400, {
                message: "Invalid username"
            });
        }

        console.log("Code: ", code);


        const _id = generateId(15);

        try {

            const result = await db.collection("users").insertOne({
                _id,
                username,
                code
            });

            const session = await lucia.createSession(_id, {});
            const sessionCookie = lucia.createSessionCookie(session.id);
            event.cookies.set(sessionCookie.name, sessionCookie.value, {
                path: ".",
                ...sessionCookie.attributes
            });
        } catch (e) {
            return fail(500, {
                message: "An unknown error occurred"
            });
        }
        console.log("VOR REDIRECT");
        return redirect(302, "/");
    }
};
