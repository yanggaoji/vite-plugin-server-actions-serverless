import { defineConfig } from "vite";
import serverActions from "vite-plugin-server-actions";

export default defineConfig({
	plugins: [
		serverActions({
			validation: { enabled: true },
			openAPI: {
				enabled: true,
				info: {
					title: "My API",
					version: "1.0.0",
					description: "Test API",
				},
				swaggerUI: true,
			},
		}),
	],
});
