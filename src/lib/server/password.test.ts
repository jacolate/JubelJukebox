import { describe, expect, it } from 'vitest';
import { hashPassword, safeEqual, verifyPassword } from './password.ts';

describe('password hashing', () => {
	it('verifies the correct password and rejects others', async () => {
		const hash = await hashPassword('correct horse battery');
		expect(hash).toMatch(/^scrypt:32768:8:1:[\w-]+:[\w-]+$/);
		expect(await verifyPassword('correct horse battery', hash)).toBe(true);
		expect(await verifyPassword('correct horse batterY', hash)).toBe(false);
		expect(await verifyPassword('', hash)).toBe(false);
	});

	it('uses a random salt', async () => {
		expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
	});

	it('rejects malformed hashes', async () => {
		expect(await verifyPassword('x', 'plain-text')).toBe(false);
		expect(await verifyPassword('x', 'scrypt:a:b:c:d:e')).toBe(false);
	});
});

describe('safeEqual', () => {
	it('compares strings of different length', () => {
		expect(safeEqual('EVENT123', 'EVENT123')).toBe(true);
		expect(safeEqual('EVENT123', 'EVENT12')).toBe(false);
		expect(safeEqual('', 'x')).toBe(false);
	});
});
