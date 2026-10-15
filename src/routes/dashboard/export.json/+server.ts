import { apiRequireAdmin } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import { buildRecap } from '#lib/server/recap.ts';
import { songs } from '#lib/server/services.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	apiRequireAdmin(event);
	const list = songs().list();
	const body = { exportedAt: new Date().toISOString(), recap: buildRecap(getDb(), list), songs: list };
	const date = body.exportedAt.slice(0, 10);
	return new Response(JSON.stringify(body, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="jukebox-${date}.json"`,
			'Cache-Control': 'no-store'
		}
	});
};
