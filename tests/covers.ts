import type { BrowserContext } from '@playwright/test';

// 8×8 px orange PNG – stands in for album covers so tests never hit Spotify's CDN.
const COVER = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJklEQVR4AYXBMQEAIAzAsNIbgfg/McEc0GTdsx8fEiRIkCBBgoQBYxQCXaYnotAAAAAASUVORK5CYII=',
	'base64'
);

export async function serveCovers(context: BrowserContext) {
	await context.route('https://i.scdn.co/**', (route) => route.fulfill({ body: COVER, contentType: 'image/png' }));
}
