import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import serverActions from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("TypeScript Module Resolution Fix", () => {
	let plugin;
	let mockViteServer;

	beforeEach(() => {
		// Mock Vite server with ssrLoadModule
		mockViteServer = {
			middlewares: {
				use: vi.fn(),
			},
			httpServer: null,
			watcher: null,
			ssrLoadModule: vi.fn(async (id) => {
				// Mock successful module loading
				return {
					testFunction: async () => "mocked result",
					schema: { parse: () => {} },
				};
			}),
		};

		// Initialize plugin
		plugin = serverActions({
			include: ["**/*.server.ts"],
			validation: { enabled: true },
		});

		plugin.configResolved({ server: { port: 5173 } });
		plugin.configureServer(mockViteServer);
	});

	it("should generate client proxy when loading server files", async () => {
		const testPath = "/test/module.server.ts";

		// Mock file read
		vi.spyOn(fs, "readFile").mockResolvedValue(`
      export async function testFunction() {
        return "test";
      }
    `);

		// Load the module (this should generate client proxy, not call ssrLoadModule directly)
		const result = await plugin.load(testPath);

		// Should generate client proxy code
		expect(result).toBeTruthy();
		expect(result).toContain("export async function testFunction");
		expect(result).toContain("fetch");
		
		// ssrLoadModule should NOT be called in the load hook (deferred to request time)
		expect(mockViteServer.ssrLoadModule).not.toHaveBeenCalled();
	});

	it("should resolve TypeScript imports correctly", async () => {
		const testCases = [
			{
				importer: "/project/src/actions/test.server.ts",
				source: "./types",
				expected: "/project/src/actions/types.ts",
			},
			{
				importer: "/project/src/actions/test.server.ts",
				source: "../shared/utils",
				expected: "/project/src/shared/utils.ts",
			},
			{
				importer: "/project/src/test.server.ts",
				source: "./models",
				expected: "/project/src/models.ts",
			},
		];

		// Mock file existence checks
		vi.spyOn(fs, "stat").mockImplementation(async (filePath) => {
			// Simulate that .ts files exist
			if (filePath.endsWith(".ts")) {
				return { isFile: () => true };
			}
			throw new Error("File not found");
		});

		for (const { importer, source, expected } of testCases) {
			const result = await plugin.resolveId(source, importer);
			expect(result).toBe(expected);
		}
	});

	it("should handle both .ts and without extension imports", async () => {
		const importer = "/project/src/test.server.ts";

		// Mock that types.ts exists
		vi.spyOn(fs, "stat").mockImplementation(async (filePath) => {
			if (filePath === "/project/src/types.ts") {
				return { isFile: () => true };
			}
			throw new Error("File not found");
		});

		// Both should resolve to the same file
		const result1 = await plugin.resolveId("./types", importer);
		const result2 = await plugin.resolveId("./types.ts", importer);

		expect(result1).toBe("/project/src/types.ts");
		expect(result2).toBe("/project/src/types.ts");
	});

	it("should resolve index.ts when importing a directory", async () => {
		const importer = "/project/src/test.server.ts";

		// Mock that models/index.ts exists
		vi.spyOn(fs, "stat").mockImplementation(async (filePath) => {
			if (filePath === "/project/src/models/index.ts") {
				return { isFile: () => true };
			}
			if (filePath === "/project/src/models") {
				return { isFile: () => false };
			}
			throw new Error("File not found");
		});

		const result = await plugin.resolveId("./models", importer);
		expect(result).toBe("/project/src/models/index.ts");
	});

	it("should not interfere with non-TypeScript imports", async () => {
		const importer = "/project/src/test.server.ts";

		// Node modules should not be resolved
		const result1 = await plugin.resolveId("express", importer);
		expect(result1).toBeNull();

		// Non-server file imports should not be resolved
		const clientImporter = "/project/src/client.ts";
		const result2 = await plugin.resolveId("./types", clientImporter);
		expect(result2).toBeNull();
	});

	it("should fall back to esbuild when ssrLoadModule is not available", async () => {
		// Create plugin without Vite server
		const pluginWithoutServer = serverActions({
			include: ["**/*.server.ts"],
		});

		pluginWithoutServer.configResolved({ server: { port: 5173 } });
		pluginWithoutServer.configureServer({
			middlewares: { use: vi.fn() },
			httpServer: null,
			watcher: null,
			// No ssrLoadModule
		});

		const testPath = "/test/fallback.server.ts";

		// Mock file operations
		vi.spyOn(fs, "readFile").mockResolvedValue(`
      export async function fallbackTest() {
        return "fallback";
      }
    `);
		vi.spyOn(fs, "writeFile").mockResolvedValue();
		vi.spyOn(fs, "unlink").mockResolvedValue();

		// This should work even without ssrLoadModule
		const result = await pluginWithoutServer.load(testPath);
		expect(result).toContain("export async function fallbackTest");
	});
});
