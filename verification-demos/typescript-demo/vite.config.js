import { defineConfig } from "vite";
import serverActions from "vite-plugin-server-actions";

export default defineConfig({
	plugins: [serverActions()],
});
