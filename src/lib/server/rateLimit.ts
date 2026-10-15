interface Bucket {
	count: number;
	resetAt: number;
}

/**
 * Fixed-window in-memory rate limiter. Sufficient for a single replica;
 * with multiple replicas each instance enforces its own limit.
 */
export class RateLimiter {
	readonly #buckets = new Map<string, Bucket>();

	constructor(
		readonly limit: number,
		readonly windowMs: number
	) {}

	/** Registers a hit and returns whether it is still within the limit. */
	hit(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
		if (this.#buckets.size > 10_000) this.#prune(now);

		let bucket = this.#buckets.get(key);
		if (!bucket || bucket.resetAt <= now) {
			bucket = { count: 0, resetAt: now + this.windowMs };
			this.#buckets.set(key, bucket);
		}
		bucket.count++;
		return {
			allowed: bucket.count <= this.limit,
			retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000)
		};
	}

	/** Returns whether the key is currently blocked, without counting a hit. */
	isBlocked(key: string, now = Date.now()): boolean {
		const bucket = this.#buckets.get(key);
		return !!bucket && bucket.resetAt > now && bucket.count >= this.limit;
	}

	reset(key: string) {
		this.#buckets.delete(key);
	}

	#prune(now: number) {
		for (const [key, bucket] of this.#buckets) {
			if (bucket.resetAt <= now) this.#buckets.delete(key);
		}
	}
}
