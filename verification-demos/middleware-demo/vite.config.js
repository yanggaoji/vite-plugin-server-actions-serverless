import { defineConfig } from "vite";
import serverActions, { middleware } from "vite-plugin-server-actions";

export default defineConfig({
	plugins: [
		serverActions({
			middleware: [
				// Custom middleware that adds timestamp
				(req, res, next) => {
					req.requestTimestamp = Date.now();
					console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
					next();
				},
				middleware.logging, // Built-in logging middleware
			],
		}),
	],
});
