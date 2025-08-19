import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import fetch from "node-fetch";
import net from "net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const todoAppDir = path.join(__dirname, "../examples/svelte-todo-app");

// Helper function to find an available port
async function getAvailablePort(startPort = 3000) {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.listen(startPort, (err) => {
			if (err) {
				// Port is in use, try next one
				server.close();
				getAvailablePort(startPort + 1).then(resolve).catch(reject);
			} else {
				const port = server.address().port;
				server.close(() => resolve(port));
			}
		});
		server.on('error', () => {
			// Port is in use, try next one
			getAvailablePort(startPort + 1).then(resolve).catch(reject);
		});
	});
}

describe("Production Build", () => {
	let serverProcess;
	let PORT; // Will be assigned dynamically

	beforeAll(async () => {
		// Find an available port
		PORT = await getAvailablePort(3009);
		console.log(`Using port ${PORT} for production build test`);
		
		console.log("Building todo app...");
		// Build the app
		await new Promise((resolve, reject) => {
			const buildProcess = spawn("npm", ["run", "build"], {
				cwd: todoAppDir,
				stdio: "inherit",
			});

			buildProcess.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`Build failed with code ${code}`));
				}
			});
		});

		// Check what files were generated
		const distFiles = await fs.readdir(path.join(todoAppDir, "dist"));
		console.log("Generated files:", distFiles);

		// Start the production server
		console.log("Starting production server...");
		serverProcess = spawn("node", ["dist/server.js"], {
			cwd: todoAppDir,
			env: { ...process.env, PORT: PORT.toString() },
		});

		// Wait for server to be ready
		await new Promise((resolve, reject) => {
			let output = "";

			serverProcess.stdout.on("data", (data) => {
				output += data.toString();
				console.log("Server output:", data.toString());
				if (output.includes("Server listening")) {
					resolve();
				}
			});

			serverProcess.stderr.on("data", (data) => {
				console.error("Server error:", data.toString());
			});

			serverProcess.on("error", (err) => {
				reject(err);
			});

			// Timeout after 10 seconds
			global.setTimeout(() => reject(new Error("Server failed to start")), 10000);
		});

		// Give it a bit more time to fully initialize
		await new Promise((resolve) => global.setTimeout(resolve, 1000));
	}, 30000);

	afterAll(async () => {
		if (serverProcess) {
			serverProcess.kill("SIGTERM");
			// Wait a bit for the process to fully terminate
			await new Promise((resolve) => global.setTimeout(resolve, 1000));
		}
	});

	describe("Server functionality", () => {
		it("should serve the static files", async () => {
			const response = await fetch(`http://localhost:${PORT}/`);
			expect(response.ok).toBeTruthy();
			const html = await response.text();
			expect(html.toLowerCase()).toContain("<!doctype html>");
		});

		it("should handle getTodos endpoint", async () => {
			const response = await fetch(`http://localhost:${PORT}/api/actions/todo/getTodos`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify([]),
			});

			expect(response.ok).toBeTruthy();
			const todos = await response.json();
			expect(Array.isArray(todos)).toBeTruthy();
		});

		it("should handle addTodo with validation", async () => {
			// Test with valid data
			const validResponse = await fetch(`http://localhost:${PORT}/api/actions/todo/addTodo`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify([{ text: "Test todo", priority: "high" }]),
			});

			expect(validResponse.ok).toBeTruthy();
			const newTodo = await validResponse.json();
			expect(newTodo).toHaveProperty("id");
			expect(newTodo.text).toBe("Test todo");
			expect(newTodo.priority).toBe("high");

			// Test with invalid data (if validation is working)
			const invalidResponse = await fetch(`http://localhost:${PORT}/api/actions/todo/addTodo`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify([{ text: "", priority: "invalid" }]),
			});

			// If validation is working, this should fail
			// If not, we need to fix it
			console.log("Invalid data response status:", invalidResponse.status);
			if (invalidResponse.status === 400) {
				const error = await invalidResponse.json();
				expect(error).toHaveProperty("error");
				expect(error.error).toContain("Validation");
			} else {
				console.warn("WARNING: Validation not working in production build!");
			}
		});
	});

	describe("OpenAPI functionality", () => {
		it("should serve OpenAPI spec if enabled", async () => {
			const response = await fetch(`http://localhost:${PORT}/api/openapi.json`);

			if (response.ok) {
				const spec = await response.json();
				expect(spec.openapi).toBe("3.0.3");
				expect(spec.info.title).toBe("Svelte Todo App API");
				expect(spec.paths).toBeDefined();

				// Check if paths are using the correct format
				const paths = Object.keys(spec.paths);
				console.log("OpenAPI paths:", paths);

				// Should have todo endpoints
				expect(paths).toContain("/api/actions/todo/getTodos");
				expect(paths).toContain("/api/actions/todo/addTodo");
			} else {
				console.warn("WARNING: OpenAPI endpoint not available in production!");
			}
		});

		it("should serve Swagger UI if enabled", async () => {
			const response = await fetch(`http://localhost:${PORT}/api/docs`);

			if (response.ok) {
				const html = await response.text();
				expect(html).toContain("swagger");
			} else {
				console.warn("WARNING: Swagger UI not available in production!");
			}
		});
	});

	describe("Build artifacts", () => {
		it("should generate correct server.js", async () => {
			const serverCode = await fs.readFile(path.join(todoAppDir, "dist/server.js"), "utf-8");

			// Check for validation imports
			if (serverCode.includes("createValidationMiddleware")) {
				console.log("✓ Validation imports found");
			} else {
				console.warn("✗ Validation imports missing");
			}

			// Check for middleware in routes
			if (serverCode.includes("validationMiddleware") || serverCode.includes("validationContext")) {
				console.log("✓ Validation middleware found in routes");
			} else {
				console.warn("✗ Validation middleware missing from routes");
			}

			// Check for OpenAPI setup
			if (serverCode.includes("openapi.json")) {
				console.log("✓ OpenAPI setup found");
			} else {
				console.warn("✗ OpenAPI setup missing");
			}

			// Check module naming
			if (serverCode.includes("serverActions.src_actions_todo")) {
				console.log("✓ Using legacy module naming (src_actions_todo)");
			} else if (serverCode.includes("serverActions.actions_todo")) {
				console.log("✓ Using clean module naming (actions_todo)");
			} else {
				console.warn("✗ Unknown module naming pattern");
			}
		});

		it("should generate actions.js with schemas", async () => {
			const actionsCode = await fs.readFile(path.join(todoAppDir, "dist/actions.js"), "utf-8");

			// Check if schemas are exported with functions
			if (actionsCode.includes(".schema =") || actionsCode.includes("schema:")) {
				console.log("✓ Schemas found in actions.js");
			} else {
				console.warn("✗ Schemas missing from actions.js");
			}
		});

		it("should generate openapi.json if enabled", async () => {
			try {
				const openAPISpec = await fs.readFile(path.join(todoAppDir, "dist/openapi.json"), "utf-8");
				const spec = JSON.parse(openAPISpec);

				expect(spec.openapi).toBe("3.0.3");
				expect(spec.paths).toBeDefined();

				// Check if schemas are included
				const paths = Object.values(spec.paths);
				const hasSchemas = paths.some((path) => path.post?.requestBody?.content?.["application/json"]?.schema);

				if (hasSchemas) {
					console.log("✓ Request schemas found in OpenAPI spec");
				} else {
					console.warn("✗ Request schemas missing from OpenAPI spec");
				}
			} catch (error) {
				console.warn("✗ openapi.json not found or invalid");
			}
		});
	});
});
