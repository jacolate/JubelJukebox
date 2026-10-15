import { ENTRY_CODE } from '$app/env/private';
import type { RequestEvent } from '@sveltejs/kit';
import { renderSVG } from 'uqr';

/** Join link with the event code pre-filled, and its QR code as SVG markup (only paths, no text). */
export function invite(event: RequestEvent) {
	const url = new URL('/login', event.url.origin);
	url.searchParams.set('code', ENTRY_CODE);
	return {
		joinUrl: url.href,
		entryCode: ENTRY_CODE,
		qrSvg: renderSVG(url.href, { border: 1, ecc: 'M' })
	};
}
