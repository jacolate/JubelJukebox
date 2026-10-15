// Starts the production build for the e2e tests with a fresh database.
// Usage: node tests/server.ts <main|limits|visual>
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_ENV, SERVERS } from './env.ts';

const name = process.argv[2] as keyof typeof SERVERS;
if (!(name in SERVERS)) throw new Error(`unknown server ${name}`);

const dir = join('test-results', 'db', name);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

Object.assign(process.env, APP_ENV, { PORT: String(SERVERS[name]), DATABASE_PATH: join(dir, 'jukebox.db') });
// Computed path: the build output is not part of the type-checked sources.
await import(pathToFileURL(resolve('build/index.js')).href);
