import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Format: scrypt:<N>:<r>:<p>:<salt base64url>:<hash base64url>
// No `$` on purpose – it would be expanded as a variable by shells, Docker Compose and .env loaders.
const DEFAULT_PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 32;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, options, (err, key) =>
			err ? reject(err) : resolve(key)
		);
	});
}

function maxmem({ N = 0, r = 0 }: ScryptOptions) {
	return 256 * N * r;
}

export async function hashPassword(password: string, params = DEFAULT_PARAMS): Promise<string> {
	const salt = randomBytes(16);
	const key = await deriveKey(password, salt, { ...params, maxmem: maxmem(params) });
	return ['scrypt', params.N, params.r, params.p, salt.toString('base64url'), key.toString('base64url')].join(':');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split(':');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [N, r, p] = parts.slice(1, 4).map(Number);
	if (![N, r, p].every(Number.isSafeInteger)) return false;
	const salt = Buffer.from(parts[4], 'base64url');
	const expected = Buffer.from(parts[5], 'base64url');
	const actual = await deriveKey(password, salt, { N, r, p, maxmem: maxmem({ N, r }) });
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Constant-time comparison of two strings of arbitrary length. */
export function safeEqual(a: string, b: string): boolean {
	const digest = (value: string) => createHash('sha256').update(value).digest();
	return timingSafeEqual(digest(a), digest(b));
}
