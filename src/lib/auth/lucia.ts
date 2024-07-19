import { Lucia } from 'lucia';
import { MongodbAdapter } from "@lucia-auth/adapter-mongodb";
import { Collection, MongoClient } from "mongodb";
import { getDb } from '$lib/server/db';

interface UserDoc {
	_id: string;
    user_id: string;
    username: string;
}

interface SessionDoc {
	_id: string;
	expires_at: Date;
	user_id: string;
}

const db = getDb();

const secretCode = "***REMOVED***"; // Replace with your actual shared secret code

const User = db.collection("users") as Collection<UserDoc>;
const Session = db.collection("sessions") as Collection<SessionDoc>;

const adapter = new  MongodbAdapter(Session, User);

export const auth = new Lucia(adapter,{
    sessionCookie: {
        attributes: {
            secure: false
        }
    },
});

export const verifyCode = async (code: string): Promise<boolean> => {
    console.log("Code im auth: ", code);
    return code === secretCode;
};

