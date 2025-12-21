import { defineConfig } from "vite";
import serverActions, { pathUtils } from "vite-plugin-server-actions";

export default defineConfig({
	plugins: [
		serverActions({
			routeTransform: pathUtils.createLegacyRoute,
		}),
	],
});
