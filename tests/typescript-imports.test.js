import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import serverActions from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("TypeScript cross-file imports", () => {
  let mockViteServer;
  let plugin;
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = path.join(__dirname, "temp-ts-test");
    await fs.mkdir(tempDir, { recursive: true });

    // Create mock Vite server with ssrLoadModule
    mockViteServer = {
      middlewares: {
        use: vi.fn(),
      },
      httpServer: null,
      watcher: null,
      ssrLoadModule: vi.fn(async (id) => {
        // Simulate loading TypeScript modules
        if (id.includes("types.ts")) {
          return {
            UserId: "string & { __brand: 'UserId' }",
            createUserId: (id) => `user_${id}`,
          };
        }
        if (id.includes("server.ts")) {
          return {
            getUser: async (id) => ({ id, name: "Test User" }),
          };
        }
        throw new Error(`Module not found: ${id}`);
      }),
    };

    // Initialize plugin
    plugin = serverActions({
      include: ["**/*.server.ts"],
      validation: { enabled: true },
    });

    // Set up plugin with mock Vite config
    plugin.configResolved({ server: { port: 5173 } });
    plugin.configureServer(mockViteServer);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("should resolve TypeScript imports from server files", async () => {
    const importerPath = path.join(tempDir, "test.server.ts");
    
    // Test resolving various TypeScript import patterns
    const testCases = [
      { source: "./types", expected: path.join(tempDir, "types.ts") },
      { source: "./types.ts", expected: path.join(tempDir, "types.ts") },
      { source: "./utils/helpers", expected: path.join(tempDir, "utils/helpers.ts") },
      { source: "./config/index", expected: path.join(tempDir, "config/index.ts") },
    ];

    // Create necessary files for testing
    await fs.writeFile(path.join(tempDir, "types.ts"), "export type Test = string;");
    await fs.mkdir(path.join(tempDir, "utils"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "utils/helpers.ts"), "export const helper = () => {};");
    await fs.mkdir(path.join(tempDir, "config"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "config/index.ts"), "export const config = {};");

    for (const { source, expected } of testCases) {
      const resolved = await plugin.resolveId(source, importerPath);
      expect(resolved).toBe(expected);
    }
  });

  it("should load server files with TypeScript imports using ssrLoadModule", async () => {
    const serverFilePath = path.join(tempDir, "analytics.server.ts");
    
    // Create a server file with TypeScript imports
    const serverCode = `
import { UserId, createUserId } from "./types";
import type { AnalyticsEvent } from "./analytics-types";

export async function trackEvent(userId: UserId, event: AnalyticsEvent) {
  return {
    userId,
    event,
    timestamp: new Date()
  };
}

trackEvent.schema = z.object({
  userId: z.string(),
  event: z.object({
    type: z.string(),
    data: z.any()
  })
});
`;

    await fs.writeFile(serverFilePath, serverCode);

    // Mock file reads
    vi.spyOn(fs, "readFile").mockImplementation(async (filePath) => {
      if (filePath === serverFilePath) {
        return serverCode;
      }
      throw new Error(`File not found: ${filePath}`);
    });

    // Load the server file
    const result = await plugin.load(serverFilePath);

    // Verify that the plugin generates client proxy code
    expect(result).toContain("export async function trackEvent");
    expect(result).toContain("fetch");
    expect(result).toContain("/api/");

    // Verify that ssrLoadModule was called (for schema discovery)
    expect(mockViteServer.ssrLoadModule).toHaveBeenCalledWith(serverFilePath);
  });

  it("should handle TypeScript imports in nested server files", async () => {
    const nestedPath = path.join(tempDir, "actions/nested.server.ts");
    await fs.mkdir(path.join(tempDir, "actions"), { recursive: true });

    // Test resolving imports from nested directories
    const testCases = [
      { source: "../types", expected: path.join(tempDir, "types.ts") },
      { source: "./local-types", expected: path.join(tempDir, "actions/local-types.ts") },
      { source: "../shared/utils", expected: path.join(tempDir, "shared/utils.ts") },
    ];

    // Create necessary files
    await fs.writeFile(path.join(tempDir, "types.ts"), "export type Test = string;");
    await fs.writeFile(path.join(tempDir, "actions/local-types.ts"), "export type Local = number;");
    await fs.mkdir(path.join(tempDir, "shared"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "shared/utils.ts"), "export const util = () => {};");

    for (const { source, expected } of testCases) {
      const resolved = await plugin.resolveId(source, nestedPath);
      expect(resolved).toBe(expected);
    }
  });

  it("should fallback to manual compilation when ssrLoadModule fails", async () => {
    // Create a mock server without ssrLoadModule
    const mockServerWithoutSSR = {
      middlewares: {
        use: vi.fn(),
      },
      httpServer: null,
      watcher: null,
    };
    plugin.configureServer(mockServerWithoutSSR);

    const serverFilePath = path.join(tempDir, "fallback.server.ts");
    const serverCode = `
export async function testFunction() {
  return { message: "Hello from TypeScript" };
}
`;

    await fs.writeFile(serverFilePath, serverCode);
    
    vi.spyOn(fs, "readFile").mockImplementation(async (filePath) => {
      if (filePath === serverFilePath) {
        return serverCode;
      }
      throw new Error(`File not found: ${filePath}`);
    });

    // This should use the fallback esbuild compilation
    const result = await plugin.load(serverFilePath);
    
    // Should still generate proxy code
    expect(result).toContain("export async function testFunction");
  });

  it("should handle index.ts imports correctly", async () => {
    const importerPath = path.join(tempDir, "test.server.ts");
    
    // Create directory with index.ts
    await fs.mkdir(path.join(tempDir, "models"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "models/index.ts"), "export const model = {};");

    // Should resolve directory import to index.ts
    const resolved = await plugin.resolveId("./models", importerPath);
    expect(resolved).toBe(path.join(tempDir, "models/index.ts"));
  });

  it("should not interfere with non-server file imports", async () => {
    const clientFile = path.join(tempDir, "client.ts");
    
    // Should return null for non-server file imports
    const resolved = await plugin.resolveId("./types", clientFile);
    expect(resolved).toBeNull();
  });

  it("should handle absolute imports from server files", async () => {
    const serverFilePath = path.join(tempDir, "test.server.ts");
    const absolutePath = path.join(tempDir, "absolute-types.ts");
    
    await fs.writeFile(absolutePath, "export type Absolute = boolean;");
    
    // Test absolute path import
    const resolved = await plugin.resolveId(absolutePath, serverFilePath);
    expect(resolved).toBe(absolutePath);
  });
});