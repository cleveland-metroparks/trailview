import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		csp: {
			directives: {
				'object-src': ['none'],
				'script-src': ['strict-dynamic'],
				'style-src': ['self', 'unsafe-inline'],
				'base-uri': ['none']
			}
		}
	},
	vitePlugin: {
		inspector: true
	}
};

export default config;
