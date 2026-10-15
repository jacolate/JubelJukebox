// See https://svelte.dev/docs/kit/types#app
declare global {
	namespace App {
		interface Locals {
			session: import('#lib/server/session.ts').Session | null;
		}
	}
}

export {};
