import { TIMEZONE } from '$app/env/private';
import { getLocale } from '#lib/paraglide/runtime.js';

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(kind: 'dateTime' | 'time' | 'date'): Intl.DateTimeFormat {
	const locale = getLocale();
	const key = `${locale}:${kind}`;
	let format = formatters.get(key);
	if (!format) {
		const options: Intl.DateTimeFormatOptions =
			kind === 'dateTime'
				? { dateStyle: 'medium', timeStyle: 'short' }
				: kind === 'time'
					? { hour: '2-digit', minute: '2-digit' }
					: { dateStyle: 'long' };
		format = new Intl.DateTimeFormat(locale, { ...options, timeZone: TIMEZONE });
		formatters.set(key, format);
	}
	return format;
}

/** Formats in the event's time zone (the server itself usually runs in UTC) and the request's language. */
export const formatDateTime = (iso: string | null) => (iso ? formatter('dateTime').format(new Date(iso)) : '');
export const formatTime = (iso: string | null) => (iso ? formatter('time').format(new Date(iso)) : '');
export const formatDate = (iso: string | null) => (iso ? formatter('date').format(new Date(iso)) : '');
