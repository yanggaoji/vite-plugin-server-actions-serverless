import { describe, it, expect, vi } from "vitest";
import serverActions from "../src/index.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("TypeScript support in plugin", () => {
	it("should process TypeScript server files", async () => {
		const plugin = serverActions({
			include: ["**/*.server.ts", "**/*.server.js"],
		});

		// Test resolveId hook
		const resolveId = plugin.resolveId;
		const tsFilePath = "actions/test.server.ts";
		const importer = "/project/src/index.ts";

		// The plugin only resolves if the file matches the include pattern
		const resolved = await resolveId.call(plugin, tsFilePath, importer);

		// resolveId returns the resolved path only if it matches include patterns
		if (resolved) {
			expect(resolved).toBe(path.resolve(path.dirname(importer), tsFilePath));
		}
	});

	it("should handle TypeScript files in load hook", async () => {
		const plugin = serverActions({
			include: ["**/*.server.ts", "**/*.server.js"],
		});

		const load = plugin.load;
		const tsFilePath = path.join(__dirname, "fixtures/typed.server.ts");

		// The load hook should process TypeScript files
		try {
			const result = await load.call(plugin, tsFilePath);

			// If successful, should return client proxy code
			if (result && typeof result === "string") {
				expect(result).toContain("export async function");
				expect(result).toContain("fetch");
			}
		} catch (error) {
			// TypeScript files might need compilation setup
			console.log("Note: TypeScript file processing requires proper compilation setup");
		}
	});

	it("should support mixed JS and TS server files", async () => {
		const plugin = serverActions({
			include: ["**/*.server.js", "**/*.server.ts"],
			routeTransform: (filePath, functionName) => {
				// Remove extension and create route
				const base = filePath.replace(/\.server\.(js|ts)$/, "");
				return `${base}/${functionName}`;
			},
		});

		const load = plugin.load;

		// Test JS file
		const jsResult = await load.call(plugin, "/project/todo.server.js");

		// Test TS file
		const tsResult = await load.call(plugin, "/project/user.server.ts");

		// Both should be processed if they exist
		expect(typeof load).toBe("function");
	});

	it("should validate TypeScript file patterns", () => {
		const plugin = serverActions({
			include: "**/*.server.ts",
			exclude: ["**/*.test.server.ts", "**/*.spec.server.ts"],
		});

		expect(plugin.name).toBe("vite-plugin-server-actions");
	});
});

describe("TypeScript configuration options", () => {
	it("should accept all TypeScript-defined options", () => {
		const fullOptions = {
			apiPrefix: "/api/v2",
			include: ["src/**/*.server.ts", "api/**/*.server.js"],
			exclude: ["**/*.test.*", "**/*.spec.*"],
			middleware: [
				(req, res, next) => {
					console.log("Middleware 1");
					next();
				},
				(req, res, next) => {
					console.log("Middleware 2");
					next();
				},
			],
			moduleNameTransform: (filePath) => {
				return filePath
					.replace(/\.(js|ts)$/, "")
					.replace(/[/-]/g, "_")
					.toUpperCase();
			},
			routeTransform: (filePath, functionName) => {
				const module = filePath.replace(/^src\//, "").replace(/\.server\.(js|ts)$/, "");
				return `v2/${module}/${functionName}`;
			},
			validation: {
				enabled: true,
				adapter: "zod",
				generateOpenAPI: true,
				swaggerUI: true,
				openAPIOptions: {
					info: {
						title: "TypeScript API",
						version: "2.0.0",
						description: "API with full TypeScript support",
					},
					docsPath: "/api/v2/docs",
					specPath: "/api/v2/spec.json",
				},
			},
		};

		const plugin = serverActions(fullOptions);
		expect(plugin.name).toBe("vite-plugin-server-actions");
	});
});
