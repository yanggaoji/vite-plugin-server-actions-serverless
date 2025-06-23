import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Look for test files in the tests directory
		include: ["tests/**/*.test.{js,ts}"],
		// Test environment configuration
		environment: "node",
		// Global test configuration
		globals: true,
		// Coverage configuration
		coverage: {
			reporter: ["text", "json", "html"],
			include: ["src/**/*.js"],
			exclude: ["src/**/*.test.js"],
		},
	},
});
