import { Lucia } from 'lucia';
import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { Collection, MongoClient } from "mongodb";
import { db } from '$lib/server/db';
import { building } from '$app/environment';
interface UserDoc {
	_id: string;
    user_id : string;
    username: string;
    code: string;
}

interface SessionDoc {
	_id: string;
	expires_at: Date;
	user_id: string;
}

const secretCode = "***REMOVED***"; // Replace with your actual shared secret code

let User = null;
let Session = null;
if(!building){
    User = db.collection("users") as Collection<UserDoc>;
    Session = db.collection("sessions") as Collection<SessionDoc>;
}
const adapter = new  MongodbAdapter(Session, User);

export const lucia = new Lucia(adapter,{
    sessionCookie: {
        attributes: {
            secure: true
        }
    },
    getUserAttributes: (attributes) => {
		return {
			username: attributes.username
		};
	}
});

export const verifyCode = (code: string): boolean => {
    console.log("Code: ", code);
    return code === secretCode;
};
