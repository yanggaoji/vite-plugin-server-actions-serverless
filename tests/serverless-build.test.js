/**
 * Test serverless build functionality
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import serverActions from "../src/index.js";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Serverless Build", () => {
	describe("Configuration", () => {
		it("should accept serverless configuration", () => {
			const plugin = serverActions({
				serverless: {
					enabled: true,
					targets: ["lambda", "workers"],
				},
			});

			expect(plugin.name).toBe("vite-plugin-server-actions");
		});

		it("should default to express only when serverless not enabled", () => {
			const plugin = serverActions({
				// No serverless config
			});

			expect(plugin.name).toBe("vite-plugin-server-actions");
		});

		it("should support all target combinations", () => {
			const configs = [
				["express"],
				["lambda"],
				["workers"],
				["express", "lambda"],
				["express", "workers"],
				["lambda", "workers"],
				["express", "lambda", "workers"],
			];

			configs.forEach((targets) => {
				const plugin = serverActions({
					serverless: {
						enabled: true,
						targets,
					},
				});

				expect(plugin.name).toBe("vite-plugin-server-actions");
			});
		});
	});

	describe("Adapter Exports", () => {
		it("should export adapter classes", async () => {
			const { ExpressAdapter, LambdaAdapter, WorkersAdapter, createLambdaHandler, createWorkersHandler } = await import(
				"../src/index.js"
			);

			expect(ExpressAdapter).toBeDefined();
			expect(LambdaAdapter).toBeDefined();
			expect(WorkersAdapter).toBeDefined();
			expect(createLambdaHandler).toBeDefined();
			expect(createWorkersHandler).toBeDefined();
		});
	});

	describe("Handler Generation", () => {
		it("should generate Lambda handler code", async () => {
			const { generateLambdaHandler } = await import("../src/serverless-build.js");

			const serverFunctions = new Map([
				[
					"actions_todo",
					{
						functions: ["getTodos", "addTodo"],
						filePath: "src/actions/todo.server.js",
					},
				],
			]);

			const options = {
				apiPrefix: "/api",
				routeTransform: (filePath, functionName) => `${filePath}/${functionName}`,
				validation: { enabled: false },
				openAPI: { enabled: false },
			};

			const validationCode = {
				imports: "",
				setup: "",
				middlewareFactory: "",
				validationRuntime: "",
			};

			const code = generateLambdaHandler(serverFunctions, options, validationCode);

			expect(code).toContain("LambdaAdapter");
			expect(code).toContain("import * as serverActions from './actions.js'");
			expect(code).toContain("adapter.post");
			expect(code).toContain("export const handler = adapter.createHandler()");
			expect(code).toContain("getTodos");
			expect(code).toContain("addTodo");
		});

		it("should generate Workers handler code", async () => {
			const { generateWorkersHandler } = await import("../src/serverless-build.js");

			const serverFunctions = new Map([
				[
					"actions_todo",
					{
						functions: ["getTodos", "addTodo"],
						filePath: "src/actions/todo.server.js",
					},
				],
			]);

			const options = {
				apiPrefix: "/api",
				routeTransform: (filePath, functionName) => `${filePath}/${functionName}`,
				validation: { enabled: false },
				openAPI: { enabled: false },
			};

			const validationCode = {
				imports: "",
				setup: "",
				middlewareFactory: "",
				validationRuntime: "",
			};

			const code = generateWorkersHandler(serverFunctions, options, validationCode);

			expect(code).toContain("WorkersAdapter");
			expect(code).toContain("import * as serverActions from './actions.js'");
			expect(code).toContain("adapter.post");
			expect(code).toContain("export default adapter.createHandler()");
			expect(code).toContain("getTodos");
			expect(code).toContain("addTodo");
		});

		it("should generate Express server code", async () => {
			const { generateExpressServer } = await import("../src/serverless-build.js");

			const serverFunctions = new Map([
				[
					"actions_todo",
					{
						functions: ["getTodos", "addTodo"],
						filePath: "src/actions/todo.server.js",
					},
				],
			]);

			const options = {
				apiPrefix: "/api",
				routeTransform: (filePath, functionName) => `${filePath}/${functionName}`,
				validation: { enabled: false },
				openAPI: { enabled: false },
			};

			const validationCode = {
				imports: "",
				setup: "",
				middlewareFactory: "",
				validationRuntime: "",
			};

			const code = generateExpressServer(serverFunctions, options, validationCode);

			expect(code).toContain("import express from 'express'");
			expect(code).toContain("import * as serverActions from './actions.js'");
			expect(code).toContain("app.post");
			expect(code).toContain("app.listen");
			expect(code).toContain("getTodos");
			expect(code).toContain("addTodo");
		});
	});
});
