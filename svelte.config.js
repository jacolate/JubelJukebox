import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter(),
        alias: {
            $app: './node_modules/@sveltejs/kit/assets/app',
        },
    },
    vite: {
        define: {
            'process.env': process.env,
        },
    },
};
