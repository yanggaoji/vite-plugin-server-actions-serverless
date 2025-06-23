import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 30 * 1000,
	expect: {
		timeout: 5000,
	},
	fullyParallel: false, // Run projects sequentially to avoid port conflicts
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "list",
	use: {
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "svelte",
			use: { 
				browserName: "chromium",
				baseURL: "http://localhost:5173",
			},
			testMatch: "**/todo-app-shared.spec.js",
		},
		{
			name: "vue",
			use: { 
				browserName: "chromium",
				baseURL: "http://localhost:5174",
			},
			testMatch: "**/todo-app-shared.spec.js",
		},
		{
			name: "react",
			use: { 
				browserName: "chromium",
				baseURL: "http://localhost:5175",
			},
			testMatch: "**/todo-app-shared.spec.js",
		},
	],
	webServer: [
		{
			command: "cd examples/svelte-todo-app && npm run dev",
			url: "http://localhost:5173",
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000,
		},
		{
			command: "cd examples/vue-todo-app && npm run dev -- --port 5174",
			url: "http://localhost:5174",
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000,
		},
		{
			command: "cd examples/react-todo-app && npm run dev -- --port 5175",
			url: "http://localhost:5175",
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000,
		},
	],
});