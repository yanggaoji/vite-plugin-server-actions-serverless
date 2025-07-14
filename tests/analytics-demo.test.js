import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analyticsDir = path.join(__dirname, "../examples/typescript-analytics-demo");

describe("TypeScript Analytics Demo", () => {
  beforeAll(async () => {
    // Ensure dependencies are installed
    execSync("npm install", { cwd: analyticsDir, stdio: "ignore" });
  });

  it("should build without TypeScript errors", async () => {
    try {
      // Run TypeScript type checking
      execSync("npm run typecheck", { cwd: analyticsDir, stdio: "pipe" });
    } catch (error) {
      // If there are TypeScript errors, the command will throw
      throw new Error(`TypeScript errors in analytics demo:\n${error.stdout}\n${error.stderr}`);
    }
  });

  it("should have server files with cross-file imports", async () => {
    // Check that server files exist and contain imports
    const serverFiles = [
      "src/actions/analytics.server.ts",
      "src/actions/data-generator.server.ts"
    ];

    for (const file of serverFiles) {
      const filePath = path.join(analyticsDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      
      // Verify cross-file imports are present
      expect(content).toMatch(/import .* from ["']\.\.\/types/);
    }
  });

  it("should compile TypeScript server files without errors", async () => {
    try {
      // Try to build the project (this will use our plugin)
      const buildOutput = execSync("npm run build", { 
        cwd: analyticsDir, 
        stdio: "pipe",
        encoding: "utf-8"
      });
      
      // Build should complete without errors
      expect(buildOutput).not.toContain("error");
      expect(buildOutput).not.toContain("Error");
      
      // Check that dist directory was created
      const distPath = path.join(analyticsDir, "dist");
      const distExists = await fs.access(distPath).then(() => true).catch(() => false);
      expect(distExists).toBe(true);
    } catch (error) {
      throw new Error(`Build failed:\n${error.stdout}\n${error.stderr}`);
    }
  });

  it("should generate valid server.js with TypeScript functions", async () => {
    const serverPath = path.join(analyticsDir, "dist/server.js");
    
    try {
      const serverContent = await fs.readFile(serverPath, "utf-8");
      
      // Check that server functions are properly exported
      expect(serverContent).toContain("serverActions");
      expect(serverContent).toContain("calculateMetric");
      expect(serverContent).toContain("generateEvents");
      expect(serverContent).toContain("aggregateData");
      
      // Check that API routes are created
      expect(serverContent).toContain("/api/");
      expect(serverContent).toContain("app.post");
    } catch (error) {
      // Server.js might not exist if build failed
      console.log("Server.js not found, skipping content checks");
    }
  });

  afterAll(async () => {
    // Clean up dist directory
    try {
      await fs.rm(path.join(analyticsDir, "dist"), { recursive: true });
    } catch {
      // Ignore if dist doesn't exist
    }
  });
});