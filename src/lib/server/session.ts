import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Database } from '#lib/server/sqlite.ts';

export type Role = 'guest' | 'admin';

export interface Session {
	/** SHA-256 of the session token – the token itself is never stored. */
	id: string;
	role: Role;
	username: string;
	/** Random id of the guest behind this login, used for votes (never the token hash). */
	guestId: string;
	expiresAt: Date;
}

interface SessionRow {
	id: string;
	role: Role;
	username: string;
	guest_id: string;
	expires_at: number;
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

export function createSession(db: Database, token: string, role: Role, username: string, now = Date.now()): Session {
	const session: Session = {
		id: sessionIdFromToken(token),
		role,
		username,
		guestId: randomUUID(),
		expiresAt: new Date(now + SESSION_LIFETIME[role])
	};
	db.prepare('INSERT INTO sessions (id, role, username, guest_id, expires_at) VALUES (?, ?, ?, ?, ?)').run(
		session.id,
		role,
		username,
		session.guestId,
		session.expiresAt.getTime()
	);
	return session;
}

/**
 * Looks up the session for a token. Expired sessions are deleted.
 * Sessions past half their lifetime are extended (`renewed: true`), so the cookie must be re-set.
 */
export function validateSessionToken(
	db: Database,
	token: string,
	now = Date.now()
): { session: Session; renewed: boolean } | null {
	const id = sessionIdFromToken(token);
	const row = db.prepare('SELECT id, role, username, guest_id, expires_at FROM sessions WHERE id = ?').get(id) as
		| SessionRow
		| undefined;
	if (!row) return null;

	if (row.expires_at <= now) {
		invalidateSession(db, id);
		return null;
	}

	const session: Session = {
		id,
		role: row.role,
		username: row.username,
		guestId: row.guest_id,
		expiresAt: new Date(row.expires_at)
	};
	const lifetime = SESSION_LIFETIME[row.role];
	if (row.expires_at - now < lifetime / 2) {
		session.expiresAt = new Date(now + lifetime);
		db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(session.expiresAt.getTime(), id);
		return { session, renewed: true };
	}
	return { session, renewed: false };
}

export function isSessionActive(db: Database, id: string, now = Date.now()): boolean {
	return !!db.prepare('SELECT 1 FROM sessions WHERE id = ? AND expires_at > ?').get(id, now);
}

export function invalidateSession(db: Database, id: string) {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function deleteExpiredSessions(db: Database, now = Date.now()) {
	db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
}
