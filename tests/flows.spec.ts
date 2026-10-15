// User flows in a real browser: guests and the DJ in separate browser contexts, with live updates.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USERNAME, baseUrl, ENTRY_CODE } from './env.ts';
import { serveCovers } from './covers.ts';

const BASE = baseUrl('main');

test.describe.configure({ mode: 'serial' });

async function newPage(browser: Browser, locale = 'de-DE'): Promise<Page> {
	const context = await browser.newContext({ baseURL: BASE, locale, extraHTTPHeaders: { 'x-forwarded-proto': 'http' } });
	await serveCovers(context);
	return context.newPage();
}

async function guestPage(browser: Browser, name: string) {
	const page = await newPage(browser);
	await page.goto('/login');
	await page.getByPlaceholder('Name').fill(name);
	await page.getByPlaceholder('Code').fill(ENTRY_CODE);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await page.waitForURL('/');
	return page;
}

async function djPage(browser: Browser) {
	const page = await newPage(browser);
	await page.goto('/admin');
	await page.getByPlaceholder('Nutzername').fill(ADMIN_USERNAME);
	await page.getByPlaceholder('Passwort').fill(ADMIN_PASSWORD);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await page.waitForURL('/dashboard');
	return page;
}

async function search(page: Page, query: string) {
	await page.getByRole('searchbox').fill(query);
	await expect(page.getByRole('table')).toBeVisible();
}

async function request(page: Page, query: string, button: 'Wünschen' | '+1' = 'Wünschen') {
	await search(page, query);
	await page.getByRole('button', { name: button, exact: true }).first().click();
	await page.getByRole('dialog').getByRole('button', { name: 'Ja' }).click();
}

const card = (page: Page, name: string) => page.locator('.card', { hasText: name });

test('a request shows up live for the DJ and in "Meine"', async ({ browser }) => {
	const dj = await djPage(browser);
	const anna = await guestPage(browser, 'Anna');

	await request(anna, 'test track 11');
	await expect(anna.getByRole('alert')).toContainText('erfolgreich');
	await expect(card(dj, 'Test Track 11')).toContainText('Anna');

	await anna.getByRole('tab', { name: /Meine/ }).click();
	await expect(anna.locator('.list-row', { hasText: 'Test Track 11' })).toContainText('Offen');
});

test('a second guest adds a vote instead of a duplicate', async ({ browser }) => {
	const dj = await djPage(browser);
	const ben = await guestPage(browser, 'Ben');

	await search(ben, 'test track 11');
	await expect(ben.getByRole('button', { name: '+1', exact: true })).toBeVisible();
	await request(ben, 'test track 11', '+1');
	await expect(ben.getByRole('alert')).toContainText('Stimme');

	await expect(card(dj, 'Test Track 11')).toContainText('2 ×');
	await expect(card(dj, 'Test Track 11')).toContainText('+ 1 weiterer');
});

test('playing a song updates the guest timeline live, and undo reverts it', async ({ browser }) => {
	const dj = await djPage(browser);
	const anna = await guestPage(browser, 'Anna');
	await request(anna, 'test track 12');
	await anna.goto('/?tab=played');

	await card(dj, 'Test Track 12').getByRole('button', { name: 'Als gespielt markieren' }).click();
	await expect(anna.locator('.list-row', { hasText: 'Test Track 12' })).toBeVisible();
	await expect(dj.getByRole('tab', { name: /Gespielt/ })).toBeVisible();

	await dj.getByRole('button', { name: 'Rückgängig' }).click();
	await expect(anna.locator('.list-row', { hasText: 'Test Track 12' })).toHaveCount(0);
	await expect(card(dj, 'Test Track 12')).toContainText('Offen');
});

test('deleting can be undone', async ({ browser }) => {
	const dj = await djPage(browser);
	const guest = await guestPage(browser, 'Dora');
	await request(guest, 'test track 13');

	await card(dj, 'Test Track 13').getByRole('button', { name: 'Löschen' }).click();
	await expect(card(dj, 'Test Track 13')).toHaveCount(0);
	await dj.getByRole('button', { name: 'Rückgängig' }).click();
	await expect(card(dj, 'Test Track 13')).toBeVisible();
});

test('tabs and sorting on the dashboard', async ({ browser }) => {
	const dj = await djPage(browser);
	await dj.getByRole('tab', { name: /Offen/ }).click();
	await dj.getByLabel('Sortierung').selectOption('votes');
	await expect(dj).toHaveURL(/sort=votes/);
	await expect(dj.locator('.card').first()).toContainText('Test Track 11'); // the one with 2 votes
});

test('pausing requests in the settings dialog reaches guests live', async ({ browser }) => {
	const dj = await djPage(browser);
	const guest = await guestPage(browser, 'Emil');

	await dj.getByRole('button', { name: 'Einstellungen' }).click();
	const dialog = dj.getByRole('dialog');
	await dialog.getByLabel('Wünsche annehmen').uncheck();
	await dialog.getByRole('button', { name: 'Speichern' }).click();

	await expect(guest.getByRole('status')).toContainText('pausiert');
	await expect(dj.getByText('Wünsche pausiert')).toBeVisible();

	await dj.getByRole('button', { name: 'Einstellungen' }).click();
	await dialog.getByLabel('Wünsche annehmen').check();
	await dialog.getByRole('button', { name: 'Speichern' }).click();
	await expect(guest.getByRole('status')).toHaveCount(0);
});

test('the join link from the QR code pre-fills the code', async ({ browser }) => {
	const dj = await djPage(browser);
	await dj.getByRole('button', { name: 'Einstellungen' }).click();
	const link = await dj.getByRole('dialog').locator('p.break-all').textContent();
	expect(link).toContain(`/login?code=${ENTRY_CODE}`);

	const page = await newPage(browser);
	await page.goto(new URL(link!).pathname + new URL(link!).search);
	await expect(page.getByPlaceholder('Code')).toHaveValue(ENTRY_CODE);
	await page.getByPlaceholder('Name').fill('Scanner');
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await page.waitForURL('/');
});

test('the language switch changes the language and remembers it', async ({ browser }) => {
	const page = await newPage(browser, 'de-DE');
	await page.goto('/login');
	await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
	await page.getByRole('button', { name: 'en', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('the recap offers CSV and JSON downloads', async ({ browser }) => {
	const dj = await djPage(browser);
	await dj.goto('/dashboard/recap');
	await expect(dj.getByRole('heading', { name: 'Rückblick' })).toBeVisible();
	const [download] = await Promise.all([dj.waitForEvent('download'), dj.getByRole('link', { name: 'CSV' }).click()]);
	expect(download.suggestedFilename()).toMatch(/^jukebox-\d{4}-\d{2}-\d{2}\.csv$/);
});

test('pages run without CSP violations or console errors', async ({ browser }) => {
	const dj = await djPage(browser);
	const errors: string[] = [];
	dj.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
	dj.on('pageerror', (error) => errors.push(error.message));
	for (const path of ['/dashboard', '/dashboard/recap', '/dashboard/invite']) {
		await dj.goto(path);
		await dj.waitForLoadState('networkidle').catch(() => {});
	}
	const guest = await guestPage(browser, 'Quiet');
	guest.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
	await search(guest, 'test track');
	expect(errors).toEqual([]);
});

test.describe('phones', () => {
	// Most guests use the app on a phone: no horizontal scrolling, and no form field that makes iOS zoom in.
	const layoutProblems = () => {
		const problems: string[] = [];
		const width = document.documentElement.clientWidth;
		if (document.documentElement.scrollWidth > width + 1) {
			problems.push(`page is ${document.documentElement.scrollWidth}px wide on a ${width}px screen`);
		}
		for (const field of document.querySelectorAll<HTMLElement>('input:not([type=checkbox]), textarea, select')) {
			const rect = field.getBoundingClientRect();
			if (rect.width === 0 || field.closest('dialog:not([open])')) continue;
			const size = parseFloat(getComputedStyle(field).fontSize);
			if (size < 16) problems.push(`${field.tagName.toLowerCase()} ${field.getAttribute('name') ?? ''} has ${size}px text (iOS zooms in)`);
		}
		return problems;
	};

	for (const width of [320, 360]) {
		test(`all views fit a ${width}px screen`, async ({ browser }) => {
			const open = async () => {
				const context = await browser.newContext({
					baseURL: BASE,
					viewport: { width, height: 700 },
					isMobile: true,
					hasTouch: true,
					locale: 'de-DE',
					extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
				});
				await serveCovers(context);
				return context.newPage();
			};
			const check = async (page: Page, view: string) => expect(await page.evaluate(layoutProblems), view).toEqual([]);

			const guest = await open();
			await guest.goto('/login');
			await check(guest, 'login');
			await guest.getByPlaceholder('Name').fill('Maximiliane-Alexandra von Hohenzollern');
			await guest.getByPlaceholder('Code').fill(ENTRY_CODE);
			await guest.getByRole('button', { name: 'Anmelden' }).click();
			await guest.waitForURL('/');
			await check(guest, 'home');
			await search(guest, 'long'); // very long title and artist list
			await check(guest, 'search');
			// "+1" when an earlier run already requested the song
			await guest.getByRole('button', { name: /^(Wünschen|\+1)$/ }).click();
			await check(guest, 'confirm dialog');
			await guest.getByRole('dialog').getByRole('button', { name: 'Ja' }).click();
			await guest.goto('/?tab=mine');
			await check(guest, 'mine');

			const dj = await open();
			await dj.goto('/admin');
			await check(dj, 'admin login');
			await dj.getByPlaceholder('Nutzername').fill(ADMIN_USERNAME);
			await dj.getByPlaceholder('Passwort').fill(ADMIN_PASSWORD);
			await dj.getByRole('button', { name: 'Anmelden' }).click();
			await dj.waitForURL('/dashboard');
			await expect(dj.locator('.card').first()).toBeVisible();
			await check(dj, 'dashboard');
			await dj.getByRole('button', { name: 'Einstellungen' }).click();
			await check(dj, 'settings');
			await expect(dj.getByRole('dialog').locator('.toggle').first()).toBeInViewport();
			for (const path of ['/dashboard/recap', '/dashboard/invite']) {
				await dj.goto(path);
				await check(dj, path);
			}
		});
	}
});
