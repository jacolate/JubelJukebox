// Security tests against the production build (HTTP level, no browser).
// Brute-force/lockout tests live in rate-limit.spec.ts: they lock the IP and run on their own server.
import { expect, test } from '@playwright/test';
import { admin, Agent, guest, settingsForm } from './agent.ts';
import { baseUrl, ENTRY_CODE } from './env.ts';
import { testTrackId } from './mock-spotify.ts';

const BASE = baseUrl('main');
const AFRICA = '2374M0fQpWi3dLnB54qaLX';
const HELENE = '1cOboCuWaeQXDTtBlQnvnc';
const EXPLICIT = '7KXjTSCq5nL1LoYtL7XAwS';

test.describe.configure({ mode: 'serial' });

test.describe('authentication and roles', () => {
	test('anonymous requests are rejected', async () => {
		const anon = new Agent(BASE);
		for (const [method, path] of [
			['GET', '/api/request'],
			['POST', '/api/request'],
			['GET', '/api/search?q=x'],
			['GET', '/api/events'],
			['PUT', `/api/request/${AFRICA}`],
			['DELETE', `/api/request/${AFRICA}`],
			['POST', `/api/request/${AFRICA}/restore`],
			['GET', '/dashboard/export.csv'],
			['GET', '/dashboard/export.json']
		]) {
			const res = await anon.req(path, { method, json: method === 'GET' ? undefined : {} });
			expect(res.status, `${method} ${path}`).toBe(401);
		}
		for (const [path, location] of [
			['/', '/login'],
			['/dashboard', '/admin'],
			['/dashboard/recap', '/admin'],
			['/dashboard/invite', '/admin']
		]) {
			const res = await anon.req(path);
			expect(res.status, path).toBe(303);
			expect(res.headers.get('location'), path).toBe(location);
		}
		expect((await anon.req('/does/not/exist')).headers.get('location')).toBe('/');
	});

	test('guest login validates code and name and sets a hardened cookie', async () => {
		const agent = new Agent(BASE);
		let res = await agent.req('/login', { method: 'POST', form: { username: 'Anna', code: 'WRONG123' } });
		expect(res.status).toBe(400);
		expect(agent.cookie).toBe('');

		res = await agent.req('/login', { method: 'POST', form: { username: '', code: ENTRY_CODE } });
		expect(res.status).toBe(400);
		res = await agent.req('/login', { method: 'POST', form: { username: 'x'.repeat(41), code: ENTRY_CODE } });
		expect(res.status).toBe(400);

		// Like behind the TLS proxy in production (SvelteKit leaves out Secure only for http://localhost).
		const https = BASE.replace('http:', 'https:');
		res = await agent.req('/login', {
			method: 'POST',
			form: { username: 'Anna', code: ` ${ENTRY_CODE.toLowerCase()} ` },
			headers: { 'x-forwarded-proto': 'https' },
			origin: https
		});
		expect(res.status).toBe(303);
		const cookie = res.headers.getSetCookie().find((c) => c.startsWith('jj_session='))!;
		expect(cookie).toMatch(/HttpOnly/i);
		expect(cookie).toMatch(/Secure/i);
		expect(cookie).toMatch(/SameSite=Lax/i);
		expect(cookie).toMatch(/Path=\//);
	});

	test('cross-site form posts are blocked (CSRF)', async () => {
		const agent = new Agent(BASE);
		const res = await agent.req('/login', {
			method: 'POST',
			form: { username: 'Anna', code: ENTRY_CODE },
			origin: 'https://evil.example'
		});
		expect(res.status).toBe(403);
		expect(agent.cookie).toBe('');
	});

	test('guests have no access to DJ features', async () => {
		const g = await guest(BASE, 'Guest');
		expect((await g.req('/')).status).toBe(200);
		expect((await g.req('/dashboard')).headers.get('location')).toBe('/admin');
		expect((await g.req('/dashboard/recap')).status).toBe(303);
		expect((await g.req('/dashboard/invite')).status).toBe(303);
		for (const [method, path] of [
			['GET', '/api/request'],
			['PUT', `/api/request/${AFRICA}`],
			['DELETE', `/api/request/${AFRICA}`],
			['POST', `/api/request/${AFRICA}/restore`],
			['GET', '/dashboard/export.csv'],
			['GET', '/dashboard/export.json']
		]) {
			const res = await g.req(path, { method, json: method === 'PUT' ? { status: 'PLAYED' } : undefined });
			expect(res.status, `${method} ${path}`).toBe(403);
		}
		const res = await g.req('/dashboard?/settings', { method: 'POST', form: settingsForm() });
		expect(res.headers.get('location')).toBe('/admin');
	});

	test('admin login, tampered cookies and logout', async () => {
		const wrong = new Agent(BASE);
		expect((await wrong.req('/admin', { method: 'POST', form: { username: 'dj', password: 'nope' } })).status).toBe(400);
		expect((await wrong.req('/admin', { method: 'POST', form: { username: 'other', password: 'test-admin-password' } })).status).toBe(400);
		expect(wrong.cookie).toBe('');

		const dj = await admin(BASE);
		expect((await dj.req('/dashboard')).status).toBe(200);

		const tampered = new Agent(BASE);
		tampered.cookie = dj.cookie.slice(0, -2) + 'xx';
		expect((await tampered.req('/api/request')).status).toBe(401);

		const old = dj.cookie;
		const res = await dj.req('/dashboard?/logout', { method: 'POST', form: {} });
		expect(res.headers.get('location')).toBe('/admin');
		const replay = new Agent(BASE);
		replay.cookie = old;
		expect((await replay.req('/api/request')).status).toBe(401);
	});
});

test.describe('song requests', () => {
	test('only a valid track id is accepted; details come from Spotify', async () => {
		const g = await guest(BASE, 'Anna');
		const id = testTrackId(1);
		expect((await g.req('/api/request', { method: 'POST', json: { song: { name: 'x' } } })).status).toBe(400);
		expect((await g.req('/api/request', { method: 'POST', json: { trackId: 'javascript:alert(1)' } })).status).toBe(400);
		expect((await g.req('/api/request', { method: 'POST', json: { trackId: '0000000000000000000000' } })).status).toBe(400);
		expect((await g.req('/api/request', { method: 'POST', json: { trackId: id, pad: 'x'.repeat(5000) } })).status).toBe(413);
		expect((await g.req('/api/request', { method: 'POST', body: 'a=1', headers: { 'content-type': 'text/plain' } })).status).toBeGreaterThanOrEqual(403);
		expect((await g.req('/api/request', { method: 'POST', body: '{bad', headers: { 'content-type': 'application/json' } })).status).toBe(400);

		let res = await g.req('/api/request', {
			method: 'POST',
			json: { trackId: id, song: { name: 'FAKE' }, user: 'Hacker', status: 'PLAYED' }
		});
		expect(res.status).toBe(201);
		expect(await res.json()).toMatchObject({ result: 'created' });
		res = await g.req('/api/request', { method: 'POST', json: { trackId: id } });
		expect(await res.json()).toMatchObject({ result: 'already-voted' });

		const dj = await admin(BASE);
		const song = ((await (await dj.req('/api/request')).json()) as any[]).find((s) => s.trackId === id);
		expect(song).toMatchObject({ name: 'Test Track 01', requesters: ['Anna'], status: 'PENDING', votes: 1 });
	});

	test('a second guest votes; played and deleted songs are rejected', async () => {
		const id = testTrackId(2);
		const first = await guest(BASE, 'Anna');
		const second = await guest(BASE, 'Ben');
		const dj = await admin(BASE);
		await first.req('/api/request', { method: 'POST', json: { trackId: id } });
		const res = await second.req('/api/request', { method: 'POST', json: { trackId: id } });
		expect(await res.json()).toMatchObject({ result: 'voted' });

		const put = await dj.req(`/api/request/${id}`, { method: 'PUT', json: { status: 'PLAYED' } });
		expect(await put.json()).toEqual({ previous: 'PENDING' });
		expect((await dj.req(`/api/request/${id}`, { method: 'PUT', json: { status: 'HACKED' } })).status).toBe(400);
		const played = await guest(BASE, 'Clara');
		expect((await played.req('/api/request', { method: 'POST', json: { trackId: id } })).status).toBe(409);

		const other = testTrackId(3);
		await first.req('/api/request', { method: 'POST', json: { trackId: other } });
		expect((await dj.req('/api/request/not-an-id', { method: 'DELETE' })).status).toBe(400);
		expect((await dj.req(`/api/request/${other}`, { method: 'DELETE' })).status).toBe(200);
		expect((await dj.req(`/api/request/${other}`, { method: 'DELETE' })).status).toBe(404);
		const gone = await second.req('/api/request', { method: 'POST', json: { trackId: other } });
		expect(gone.status).toBe(410);
		expect(await gone.json()).toMatchObject({ reason: 'unavailable' });
		expect((await dj.req(`/api/request/${other}/restore`, { method: 'POST' })).status).toBe(200);
		expect((await dj.req(`/api/request/${other}/restore`, { method: 'POST' })).status).toBe(404);
	});

	test('search goes through the server and marks known songs', async () => {
		const g = await guest(BASE, 'Searcher');
		expect((await g.req('/api/search?q=' + 'x'.repeat(200))).status).toBe(400);
		const results = (await (await g.req('/api/search?q=africa')).json()) as any[];
		expect(results[0]).toMatchObject({ trackId: AFRICA, name: 'Africa', state: 'new' });
		expect(results[0].image).toMatch(/^https:\/\/i\.scdn\.co\//);
	});
});

test.describe('live updates', () => {
	test('the DJ stream gets everything', async () => {
		const dj = await admin(BASE);
		const stream = await dj.events();
		expect(stream.response.headers.get('content-type')).toBe('text/event-stream');
		expect(await stream.until('event: init')).toBe(true);
		const g = await guest(BASE, 'Live');
		await g.req('/api/request', { method: 'POST', json: { trackId: testTrackId(4) } });
		expect(await stream.until('Test Track 04')).toBe(true);
		await dj.req(`/api/request/${testTrackId(4)}`, { method: 'DELETE' });
		expect(await stream.until('event: removed')).toBe(true);
		stream.close();
	});

	test("guest streams contain their own songs and the timeline, never other guests' names", async () => {
		const id = testTrackId(5);
		const secret = await guest(BASE, 'SecretNameXYZ');
		const watcher = await guest(BASE, 'Watcher');
		const dj = await admin(BASE);
		const stream = await watcher.events();
		expect(await stream.until('event: guest-init')).toBe(true);
		expect(stream.text).not.toContain('event: init\n');

		await secret.req('/api/request', { method: 'POST', json: { trackId: id } });
		await watcher.req('/api/request', { method: 'POST', json: { trackId: id } });
		expect(await stream.until('event: mine')).toBe(true);
		await dj.req(`/api/request/${id}`, { method: 'PUT', json: { status: 'PLAYED' } });
		expect(await stream.until('Test Track 05')).toBe(true);
		expect(await stream.until('event: timeline')).toBe(true);
		expect(stream.text).not.toContain('SecretNameXYZ');
		stream.close();
	});
});

test.describe('event settings', () => {
	test.afterEach(async () => {
		await (await admin(BASE)).req('/dashboard?/settings', { method: 'POST', form: settingsForm() });
	});

	test('settings are validated and protected against CSRF', async () => {
		const dj = await admin(BASE);
		expect((await dj.req('/dashboard?/settings', { method: 'POST', form: settingsForm(), origin: 'https://evil.example' })).status).toBe(403);
		expect((await dj.req('/dashboard?/settings', { method: 'POST', form: settingsForm({ maxOpenPerGuest: '-5' }) })).status).toBe(400);
		expect((await dj.req('/dashboard?/settings', { method: 'POST', form: settingsForm({ maxOpenPerGuest: 'abc' }) })).status).toBe(400);
	});

	test('pause, blocklist, explicit filter and limit are enforced on the server', async () => {
		const dj = await admin(BASE);
		const g = await guest(BASE, 'Rules');
		const post = (trackId: string) => g.req('/api/request', { method: 'POST', json: { trackId } });

		await dj.req('/dashboard?/settings', { method: 'POST', form: settingsForm({ requestsOpen: undefined }) });
		let res = await post(testTrackId(6));
		expect(res.status).toBe(423);
		expect(await res.json()).toMatchObject({ reason: 'paused' });

		await dj.req('/dashboard?/settings', { method: 'POST', form: settingsForm({ blocklist: 'Helene\nother', blockExplicit: 'on' }) });
		expect(await (await post(HELENE)).json()).toMatchObject({ reason: 'blocked' });
		expect(await (await post(EXPLICIT)).json()).toMatchObject({ reason: 'explicit' });
		const search = (await (await g.req('/api/search?q=helene')).json()) as any[];
		expect(search[0].state).toBe('unavailable');

		await dj.req('/dashboard?/settings', { method: 'POST', form: settingsForm({ maxOpenPerGuest: '1' }) });
		expect((await post(testTrackId(7))).status).toBe(201);
		expect(await (await post(testTrackId(8))).json()).toMatchObject({ reason: 'limit' });
	});

	test('the public settings never reveal the blocklist', async () => {
		const dj = await admin(BASE);
		await dj.req('/dashboard?/settings', { method: 'POST', form: settingsForm({ blocklist: 'TopSecretBlock' }) });
		const g = await guest(BASE, 'Peek');
		const stream = await g.events();
		await stream.until('event: guest-init');
		expect(stream.text).not.toContain('TopSecretBlock');
		stream.close();
	});
});

test.describe('invite, recap and export', () => {
	test('the invite card and join link work', async () => {
		const dj = await admin(BASE);
		const html = await (await dj.req('/dashboard/invite')).text();
		expect(html).toContain('<svg');
		expect(html).toContain(ENTRY_CODE);
		const login = await new Agent(BASE).req(`/login?code=${ENTRY_CODE}`);
		expect(await login.text()).toContain(`value="${ENTRY_CODE}"`);
	});

	test('CSV export neutralizes spreadsheet formulas', async () => {
		const g = await guest(BASE, '=HYPERLINK("http://evil")');
		await g.req('/api/request', { method: 'POST', json: { trackId: testTrackId(9) } });
		const dj = await admin(BASE);
		const res = await dj.req('/dashboard/export.csv');
		expect(res.headers.get('content-type')).toMatch(/^text\/csv/);
		expect(res.headers.get('content-disposition')).toMatch(/^attachment/);
		const bytes = new Uint8Array(await res.arrayBuffer());
		expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
		const csv = new TextDecoder().decode(bytes);
		expect(csv).toContain('HYPERLINK');
		expect(csv).not.toMatch(/(^|;)"?[=+@-]/m);

		const json = await (await dj.req('/dashboard/export.json')).json();
		expect(Array.isArray(json.songs)).toBe(true);
		expect(typeof json.recap.votes).toBe('number');
		expect(await (await dj.req('/dashboard/recap')).text()).toContain('Rückblick');
	});
});

test.describe('headers and languages', () => {
	test('security headers and CSP are set', async () => {
		const res = await new Agent(BASE).req('/login');
		const csp = res.headers.get('content-security-policy')!;
		expect(csp).toMatch(/default-src 'self'/);
		expect(csp).toMatch(/script-src 'self' 'nonce-/);
		expect(csp).toMatch(/frame-ancestors 'none'/);
		expect(csp).toMatch(/img-src 'self' data: https:\/\/i\.scdn\.co/);
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
		expect((await new Agent(BASE).req('/api/search')).headers.get('cache-control')).toBe('no-store');
	});

	test('language comes from the switch cookie, then the browser, then DEFAULT_LOCALE', async () => {
		const html = async (headers: Record<string, string>) => (await new Agent(BASE).req('/login', { headers })).text();
		expect(await html({ 'accept-language': 'en-US,en;q=0.9' })).toMatch(/<html lang="en"[\s\S]*Sign in/);
		expect(await html({ 'accept-language': 'de-DE' })).toMatch(/<html lang="de"[\s\S]*Anmelden/);
		expect(await html({ 'accept-language': 'de-DE', cookie: 'PARAGLIDE_LOCALE=en' })).toContain('<html lang="en"');
		expect(await html({ 'accept-language': 'fr-FR' })).toContain('<html lang="de"');
		expect(await html({ cookie: 'PARAGLIDE_LOCALE=<script>' })).toContain('<html lang="de"');

		const res = await new Agent(BASE).req('/login', {
			method: 'POST',
			form: { username: 'X', code: 'WRONGCODE' },
			headers: { 'accept-language': 'en', accept: 'application/json' }
		});
		expect(await res.text()).toContain('Invalid code');
	});
});
