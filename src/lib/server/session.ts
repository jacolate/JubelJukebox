import { createHash, randomBytes } from 'node:crypto';
import type { Collection } from 'mongodb';

export type Role = 'guest' | 'admin';

export interface SessionDoc {
	/** SHA-256 of the session token – the token itself is never stored. */
	_id: string;
	role: Role;
	username: string;
	expiresAt: Date;
}

export interface Session {
	id: string;
	role: Role;
	username: string;
	expiresAt: Date;
}

const HOUR = 60 * 60 * 1000;

export const SESSION_LIFETIME: Record<Role, number> = {
	guest: 24 * HOUR,
	admin: 12 * HOUR
};

export function generateSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

export function sessionIdFromToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

function toSession(doc: SessionDoc): Session {
	return { id: doc._id, role: doc.role, username: doc.username, expiresAt: doc.expiresAt };
}

export async function createSession(
	sessions: Collection<SessionDoc>,
	token: string,
	role: Role,
	username: string,
	now = Date.now()
): Promise<Session> {
	const doc: SessionDoc = {
		_id: sessionIdFromToken(token),
		role,
		username,
		expiresAt: new Date(now + SESSION_LIFETIME[role])
	};
	await sessions.insertOne(doc);
	return toSession(doc);
}

/**
 * Looks up the session for a token. Expired sessions are deleted.
 * Sessions past half their lifetime are extended (`renewed: true`), so the cookie must be re-set.
 */
export async function validateSessionToken(
	sessions: Collection<SessionDoc>,
	token: string,
	now = Date.now()
): Promise<{ session: Session; renewed: boolean } | null> {
	const id = sessionIdFromToken(token);
	const doc = await sessions.findOne({ _id: id });
	if (!doc) return null;

	if (doc.expiresAt.getTime() <= now) {
		await sessions.deleteOne({ _id: id });
		return null;
	}

	const lifetime = SESSION_LIFETIME[doc.role];
	if (doc.expiresAt.getTime() - now < lifetime / 2) {
		doc.expiresAt = new Date(now + lifetime);
		await sessions.updateOne({ _id: id }, { $set: { expiresAt: doc.expiresAt } });
		return { session: toSession(doc), renewed: true };
	}

	return { session: toSession(doc), renewed: false };
}

export async function invalidateSession(sessions: Collection<SessionDoc>, id: string) {
	await sessions.deleteOne({ _id: id });
}
