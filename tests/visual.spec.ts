// Screenshot comparison of the main views (light/dark, phone/desktop).
// Baselines are created in the Playwright Linux container so they match CI: see README → Tests.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { admin, guest } from './agent.ts';
import { serveCovers } from './covers.ts';
import { ADMIN_PASSWORD, ADMIN_USERNAME, baseUrl, ENTRY_CODE } from './env.ts';
import { testTrackId } from './mock-spotify.ts';

const BASE = baseUrl('visual');
const SCHEMES = ['light', 'dark'] as const;
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
	// Predictable data: three songs in all three states, one of them with two votes.
	const [anna, ben, clara] = await Promise.all(['Anna', 'Ben', 'Clara'].map((name) => guest(BASE, name)));
	const dj = await admin(BASE);
	await anna.req('/api/request', { method: 'POST', json: { trackId: '2374M0fQpWi3dLnB54qaLX' } });
	await ben.req('/api/request', { method: 'POST', json: { trackId: '2374M0fQpWi3dLnB54qaLX' } });
	await ben.req('/api/request', { method: 'POST', json: { trackId: '003vvx7Niy0yvhvHt4a68B' } });
	await clara.req('/api/request', { method: 'POST', json: { trackId: '0GjEhVFGZW8afUYGChu3Rr' } });
	await dj.req('/api/request/003vvx7Niy0yvhvHt4a68B', { method: 'PUT', json: { status: 'STASHED' } });
	await dj.req('/api/request/0GjEhVFGZW8afUYGChu3Rr', { method: 'PUT', json: { status: 'PLAYED' } });
});

async function open(browser: Browser, scheme: (typeof SCHEMES)[number], viewport: { width: number; height: number }) {
	const context = await browser.newContext({
		baseURL: BASE,
		viewport,
		colorScheme: scheme,
		locale: 'de-DE',
		timezoneId: 'Europe/Berlin',
		extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
	});
	await serveCovers(context);
	return context.newPage();
}

async function login(page: Page, path: '/login' | '/admin', fields: [string, string][]) {
	await page.goto(path);
	for (const [placeholder, value] of fields) await page.getByPlaceholder(placeholder).fill(value);
	await page.getByRole('button', { name: 'Anmelden' }).click();
}

const shot = (page: Page, name: string) =>
	expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, mask: [page.locator('time'), page.locator('[data-dynamic]')] });

// DJ views first: the guest views add songs of their own.
for (const scheme of SCHEMES) {
	for (const [size, viewport] of Object.entries(VIEWPORTS)) {
		const tag = `${scheme}-${size}`;

		test(`DJ views ${tag}`, async ({ browser }) => {
			const page = await open(browser, scheme, viewport);
			await page.goto('/admin');
			await shot(page, `admin-${tag}`);
			await login(page, '/admin', [
				['Nutzername', ADMIN_USERNAME],
				['Passwort', ADMIN_PASSWORD]
			]);
			await page.waitForURL('/dashboard');
			await expect(page.locator('.card')).toHaveCount(1);
			await shot(page, `dashboard-${tag}`);
			await page.getByRole('button', { name: 'Einstellungen' }).click();
			await shot(page, `settings-${tag}`);
			await page.goto('/dashboard/recap');
			await shot(page, `recap-${tag}`);
		});
	}
}

for (const scheme of SCHEMES) {
	for (const [size, viewport] of Object.entries(VIEWPORTS)) {
		const tag = `${scheme}-${size}`;

		test(`guest views ${tag}`, async ({ browser }) => {
			const page = await open(browser, scheme, viewport);
			await page.goto('/login');
			await shot(page, `login-${tag}`);
			await login(page, '/login', [
				['Name', `Gast ${tag}`],
				['Code', ENTRY_CODE]
			]);
			await page.waitForURL('/');
			await shot(page, `home-${tag}`);

			await page.getByRole('searchbox').fill('a');
			await page.getByRole('button', { name: 'Suchen' }).click(); // live search starts at 2 characters
			await expect(page.getByRole('row')).toHaveCount(5);
			await shot(page, `search-${tag}`);
			await page.getByRole('button', { name: '+1', exact: true }).first().click();
			await shot(page, `confirm-${tag}`);
			await page.getByRole('dialog').getByRole('button', { name: 'Nein' }).click();

			// a song of its own, so the result doesn't depend on the order of the tests
			const own = { 'light-mobile': 31, 'light-desktop': 32, 'dark-mobile': 33, 'dark-desktop': 34 }[tag]!;
			await page.evaluate((trackId) => fetch('/api/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ trackId }) }), testTrackId(own));
			await page.goto('/?tab=mine');
			await expect(page.locator('.list-row')).toHaveCount(1);
			await shot(page, `mine-${tag}`);
			await page.goto('/?tab=played');
			await expect(page.locator('.list-row')).toHaveCount(1);
			await shot(page, `played-${tag}`);
		});
	}
}
