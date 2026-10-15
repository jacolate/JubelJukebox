import { m } from '#lib/paraglide/messages.js';
import { apiRequireAdmin } from '#lib/server/auth.ts';
import { songsToCsv } from '#lib/server/recap.ts';
import { songs } from '#lib/server/services.ts';
import { formatDateTime } from '#lib/server/time.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	apiRequireAdmin(event);
	const date = new Date().toISOString().slice(0, 10);
	const labels = {
		header: [
			m.export_title(),
			m.export_artist(),
			m.export_status(),
			m.export_votes(),
			m.export_requested_by(),
			m.export_first_request(),
			m.export_played_at()
		],
		status: { PENDING: m.status_pending(), STASHED: m.status_stashed(), PLAYED: m.status_played() }
	};
	return new Response(songsToCsv(songs().list(), formatDateTime, labels), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="jukebox-${date}.csv"`,
			'Cache-Control': 'no-store'
		}
	});
};
