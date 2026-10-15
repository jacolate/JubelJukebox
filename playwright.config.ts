import { defineConfig } from '@playwright/test';
import { MOCK_SPOTIFY_PORT, SERVERS } from './tests/env.ts';

// The app must be built first: npm run test:e2e builds and runs everything.
const visual = !!process.env.VISUAL;

const server = (name: keyof typeof SERVERS) => ({
	command: `node tests/server.ts ${name}`,
	port: SERVERS[name],
	reuseExistingServer: false,
	stdout: 'ignore' as const,
	stderr: 'pipe' as const
});

export default defineConfig({
	testDir: 'tests',
	// All specs share server state (rate limits, settings), so they run one after another.
	workers: 1,
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: { trace: 'retain-on-failure' },
	expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' } },
	snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
	webServer: [
		{ command: `node tests/mock-spotify.ts ${MOCK_SPOTIFY_PORT}`, port: MOCK_SPOTIFY_PORT, reuseExistingServer: false },
		server('main'),
		server('limits'),
		...(visual ? [server('visual')] : [])
	],
	projects: [
		{ name: 'security', testMatch: /(security|rate-limit)\.spec\.ts/ },
		{ name: 'flows', testMatch: /flows\.spec\.ts/, dependencies: ['security'] },
		// Screenshots depend on fonts and rendering of the OS – only run in the Playwright container (VISUAL=1).
		...(visual ? [{ name: 'visual', testMatch: /visual\.spec\.ts/ }] : [])
	]
});
