import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rateLimit.ts';

describe('RateLimiter', () => {
	it('blocks after the limit and resets after the window', () => {
		const limiter = new RateLimiter(3, 1000);
		expect([1, 2, 3].map(() => limiter.hit('ip', 0).allowed)).toEqual([true, true, true]);
		expect(limiter.isBlocked('ip', 10)).toBe(true);
		expect(limiter.hit('ip', 10)).toEqual({ allowed: false, retryAfterSeconds: 1 });
		expect(limiter.isBlocked('other', 10)).toBe(false);
		expect(limiter.isBlocked('ip', 1000)).toBe(false);
		expect(limiter.hit('ip', 1000).allowed).toBe(true);
	});

	it('can be reset', () => {
		const limiter = new RateLimiter(1, 1000);
		limiter.hit('ip', 0);
		expect(limiter.isBlocked('ip', 0)).toBe(true);
		limiter.reset('ip');
		expect(limiter.isBlocked('ip', 0)).toBe(false);
	});
});
