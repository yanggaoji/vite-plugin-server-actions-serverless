import { defineConfig } from "vite";
import serverActions, { pathUtils } from "../../src/index.js";

export default defineConfig({
	plugins: [
		serverActions({
			routeTransform: pathUtils.createCleanRoute,
			validation: { enabled: true },
			openAPI: {
				enabled: true,
				swaggerUI: true,
			},
		}),
	],
});
