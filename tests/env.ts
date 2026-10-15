// Configuration for the end-to-end tests. Test-only credentials – never use them for a real event.
export const ENTRY_CODE = 'TESTCODE1';
export const ADMIN_USERNAME = 'dj';
export const ADMIN_PASSWORD = 'test-admin-password';

export const MOCK_SPOTIFY_PORT = 4010;

/** One app instance per purpose, each with its own fresh database. */
export const SERVERS = {
	main: 4173,
	limits: 4174, // brute-force tests lock their IP, so they get their own instance
	visual: 4175 // screenshots need a predictable database
} as const;

export const baseUrl = (server: keyof typeof SERVERS) => `http://localhost:${SERVERS[server]}`;

export const APP_ENV = {
	ENTRY_CODE,
	ADMIN_USERNAME,
	// generated with: echo -n test-admin-password | npm run -s hash-password
	ADMIN_PASSWORD_HASH: 'scrypt:32768:8:1:IjZGwrVFy-7G1rckPizenA:iQF0sqO5Qf00l_Hs8d9OwjfqLRmz2CF98CD87uWtWw8',
	SPOTIFY_CLIENT_ID: 'test-client',
	SPOTIFY_CLIENT_SECRET: 'test-secret',
	SPOTIFY_ACCOUNTS_URL: `http://127.0.0.1:${MOCK_SPOTIFY_PORT}`,
	SPOTIFY_API_URL: `http://127.0.0.1:${MOCK_SPOTIFY_PORT}/v1`,
	// Tests talk plain http to the server and send this header, like a TLS-terminating proxy would.
	PROTOCOL_HEADER: 'x-forwarded-proto',
	DEFAULT_LOCALE: 'de',
	TIMEZONE: 'Europe/Berlin'
};
