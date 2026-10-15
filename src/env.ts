import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Returns a validator that requires a non-empty value at runtime.
 * During `vite build` the variables are not available, so they are allowed to be missing there.
 */
function required(check?: (value: string) => string | void) {
	return (value: string | undefined): string => {
		if (value === undefined || value.trim() === '') {
			if (building) return '';
			throw new Error('is required');
		}
		const problem = check?.(value);
		if (problem) throw new Error(problem);
		return value;
	};
}

export const variables = defineEnvVars({
	MONGODB_URI: {
		description: 'MongoDB connection string, e.g. mongodb://user:pass@host:27017/?authSource=songRequests',
		schema: required((value) => {
			if (!/^mongodb(\+srv)?:\/\//.test(value)) return 'must start with mongodb:// or mongodb+srv://';
		})
	},
	MONGODB_DB: {
		description: 'Database name',
		schema: (value) => value || 'songRequests'
	},
	ENTRY_CODE: {
		description: 'Code that guests enter to join the event (case-insensitive)',
		schema: required((value) => {
			if (value.trim().length < 6) return 'must be at least 6 characters long';
		})
	},
	ADMIN_USERNAME: {
		description: 'Username for the DJ dashboard login',
		schema: required()
	},
	ADMIN_PASSWORD_HASH: {
		description: 'scrypt hash of the DJ password, generate with `npm run hash-password`',
		schema: required((value) => {
			if (!value.startsWith('scrypt$')) return 'must be generated with `npm run hash-password`';
		})
	},
	SPOTIFY_CLIENT_ID: {
		description: 'Spotify app client id (client credentials flow)',
		schema: required()
	},
	SPOTIFY_CLIENT_SECRET: {
		description: 'Spotify app client secret',
		schema: required()
	}
});
