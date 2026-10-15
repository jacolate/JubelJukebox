import { defineCustomClientStrategy } from '#lib/paraglide/runtime.js';

// Use exactly the locale the server rendered (it already considered Accept-Language and DEFAULT_LOCALE),
// so hydration never switches languages.
defineCustomClientStrategy('custom-request', {
	getLocale: () => document.documentElement.lang || undefined,
	// The explicit choice is stored by the cookie strategy.
	setLocale: () => {}
});
