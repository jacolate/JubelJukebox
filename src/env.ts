import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Returns a validator that requires a non-empty value at runtime.
 * Surrounding whitespace (e.g. a trailing space copied into .env) is removed.
 * During `vite build` the variables are not available, so they are allowed to be missing there.
 */
function required(check?: (value: string) => string | void) {
	return (raw: string | undefined): string => {
		const value = raw?.trim() ?? '';
		if (value === '') {
			if (building) return '';
			throw new Error('is required');
		}
		const problem = check?.(value);
		if (problem) throw new Error(problem);
		return value;
	};
}

/** Optional URL; plain http is only accepted for local mock servers. */
function optionalUrl(fallback: string) {
	return (raw: string | undefined): string => {
		const value = raw?.trim();
		if (!value) return fallback;
		let url: URL;
		try {
			url = new URL(value);
		} catch {
			throw new Error('must be a URL');
		}
		const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
		if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
			throw new Error('must use https (http only for localhost)');
		}
		return value.replace(/\/$/, '');
	};
}

export const variables = defineEnvVars({
	DATABASE_PATH: {
		description: 'Path of the SQLite database file (created if missing)',
		schema: (value) => value?.trim() || 'data/jukebox.db'
	},
	ENTRY_CODE: {
		description: 'Code that guests enter to join the event (case-insensitive)',
		schema: required((value) => {
			if (value.length < 6) return 'must be at least 6 characters long';
		})
	},
	ADMIN_USERNAME: {
		description: 'Username for the DJ dashboard login',
		schema: required()
	},
	ADMIN_PASSWORD_HASH: {
		description: 'scrypt hash of the DJ password, generate with `npm run hash-password`',
		schema: required((value) => {
			if (!/^scrypt:\d+:\d+:\d+:[\w-]+:[\w-]+$/.test(value)) return 'must be generated with `npm run hash-password`';
		})
	},
	SPOTIFY_CLIENT_ID: {
		description: 'Spotify app client id (client credentials flow)',
		schema: required()
	},
	SPOTIFY_CLIENT_SECRET: {
		description: 'Spotify app client secret',
		schema: required()
	},
	DEFAULT_LOCALE: {
		description: "Language when the guest's browser prefers neither German nor English: de or en (default de)",
		schema: (raw) => {
			const value = raw?.trim() || 'de';
			if (value !== 'de' && value !== 'en') throw new Error('must be de or en');
			return value;
		}
	},
	TIMEZONE: {
		description: 'Time zone of the event, used for times in the recap and export (default Europe/Berlin)',
		schema: (raw) => {
			const value = raw?.trim() || 'Europe/Berlin';
			try {
				new Intl.DateTimeFormat('de', { timeZone: value });
			} catch {
				throw new Error('must be an IANA time zone, e.g. Europe/Berlin');
			}
			return value;
		}
	},
	SPOTIFY_ACCOUNTS_URL: {
		description: 'Only for tests: base URL of the Spotify accounts service (default https://accounts.spotify.com)',
		schema: optionalUrl('https://accounts.spotify.com')
	},
	SPOTIFY_API_URL: {
		description: 'Only for tests: base URL of the Spotify Web API (default https://api.spotify.com/v1)',
		schema: optionalUrl('https://api.spotify.com/v1')
	}
});
