import { Lucia } from 'lucia';
import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { Collection, MongoClient } from "mongodb";
import { db } from '$lib/server/db';

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

const secretCode = "AD6FGH6J"; // Replace with your actual shared secret code

const User = db.collection("users") as Collection<UserDoc>;
const Session = db.collection("sessions") as Collection<SessionDoc>;

const adapter = new  MongodbAdapter(Session, User);

export const lucia = new Lucia(adapter,{
    sessionCookie: {
        attributes: {
            secure: false
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
