import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import serverActions from "../../src/index.js";

export default defineConfig({
	plugins: [
		react(),
		serverActions({
			validation: {
				enabled: true,
			},
			openAPI: {
				enabled: true,
				info: {
					title: "React-ts Todo App API",
					version: "1.0.0",
					description: "API documentation for the React Todo App",
				},
			},
		}),
	],
});
