import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import serverActions from "../../src/index.js";

export default defineConfig({
	plugins: [
		vue(),
		serverActions({
			validation: {
				enabled: true,
			},
			openAPI: {
				enabled: true,
				info: {
					title: "Vue Todo App API",
					version: "1.0.0",
					description: "API documentation for the Vue Todo App",
				},
			},
		}),
	],
});
