// Brute-force protection. Runs against its own server instance, because the lockout applies per IP.
import { expect, test } from '@playwright/test';
import { Agent } from './agent.ts';
import { ADMIN_PASSWORD, ADMIN_USERNAME, baseUrl, ENTRY_CODE } from './env.ts';

const BASE = baseUrl('limits');

test.describe.configure({ mode: 'serial' });

test('admin login locks after 5 failures, even for the right password', async () => {
	const agent = new Agent(BASE);
	const statuses = [];
	for (let i = 0; i < 6; i++) {
		statuses.push((await agent.req('/admin', { method: 'POST', form: { username: ADMIN_USERNAME, password: `guess-${i}` } })).status);
	}
	expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
	const res = await agent.req('/admin', { method: 'POST', form: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } });
	expect(res.status).toBe(429);
	expect(agent.cookie).toBe('');
});

test('guest code guessing locks after 30 failures', async () => {
	const agent = new Agent(BASE);
	let blocked = 0;
	for (let i = 0; i < 32; i++) {
		const res = await agent.req('/login', { method: 'POST', form: { username: 'x', code: `WRONG${i}` } });
		if (res.status === 429) blocked++;
	}
	expect(blocked).toBe(2);
	const res = await agent.req('/login', { method: 'POST', form: { username: 'x', code: ENTRY_CODE } });
	expect(res.status).toBe(429);
});
