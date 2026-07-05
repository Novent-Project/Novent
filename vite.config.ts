import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		watch: {
			// Never watch the Rust build output — cargo holds locks on files in
			// target/ while compiling, and chokidar dies with EBUSY on Windows
			// trying to watch them, which kills `tauri dev`'s beforeDevCommand.
			ignored: ['**/src-tauri/**'],
		},
	},
});