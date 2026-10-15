import { m } from '#lib/paraglide/messages.js';
import { pageRequireAdmin } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db.ts';
import { buildRecap } from '#lib/server/recap.ts';
import { songs } from '#lib/server/services.ts';
import { formatDate, formatDateTime, formatTime } from '#lib/server/time.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	pageRequireAdmin(event);
	const list = songs().list();
	const recap = buildRecap(getDb(), list);

	// Times are formatted on the server in the event's time zone, so SSR and hydration match.
	const timeline = list
		.filter((s) => s.status === 'PLAYED' && s.playedAt)
		.sort((a, b) => a.playedAt!.localeCompare(b.playedAt!))
		.map((s) => ({ ...s, time: formatTime(s.playedAt) }));

	// "15. Oktober 2026, 19:02 – 23:58 Uhr", or with both dates if the event went past midnight
	const { firstRequestAt: from, lastPlayedAt: until } = recap;
	let period = formatDate(from);
	if (from && until && formatDate(from) === formatDate(until)) {
		period = `${formatDate(from)}, ${formatTime(from)} – ${formatTime(until)} ${m.recap_time_suffix()}`.trim();
	} else if (from && until) {
		period = `${formatDateTime(from)} – ${formatDateTime(until)} ${m.recap_time_suffix()}`.trim();
	}

	return { recap, timeline, period };
};
