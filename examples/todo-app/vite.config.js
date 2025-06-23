import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import serverActions, { middleware, pathUtils } from "../../src/index.js";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		svelte(),
		serverActions({
			// Use clean hierarchical paths for routes (actions/todo/create instead of src_actions_todo/create)
			routeTransform: pathUtils.createCleanRoute,
			// Enable validation
			validation: {
				enabled: true,
				adapter: "zod",
			},
			// Enable OpenAPI documentation
			openAPI: {
				enabled: true,
				swaggerUI: true,
				info: {
					title: "Todo App API",
					version: "1.0.0",
					description: "A simple todo application API with validation and auto-generated documentation",
				},
				docsPath: "/api/docs",
				specPath: "/api/openapi.json",
			},
			// Add logging middleware to see validation in action
			middleware: [
				middleware.logging,
			],
		}),
	],
});
