import { paraglideVitePlugin } from '@inlang/paraglide-js';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			// Explicit choice (cookie from the DE/EN switch) first, then the request: Accept-Language on
			// the server with DEFAULT_LOCALE as fallback, and the server-rendered <html lang> in the browser.
			strategy: ['cookie', 'custom-request', 'baseLocale'],
			emitTsDeclarations: true
		}),
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self'],
					// SvelteKit itself sets style attributes (app.html wrapper, route announcer).
					'style-src-attr': ['unsafe-inline'],
					'img-src': ['self', 'data:', 'https://i.scdn.co'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		})
	],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
