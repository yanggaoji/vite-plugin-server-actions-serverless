import { describe, it, expect } from "vitest";
import serverActions, {
	middleware,
	pathUtils,
	createValidationMiddleware,
	ZodAdapter,
	SchemaDiscovery,
	adapters,
	OpenAPIGenerator,
} from "../src/index.js";
import type { ServerActionOptions, ValidationOptions, OpenAPIOptions } from "../index";
import type { RequestHandler } from "express";
import { z } from "zod";

describe("TypeScript definitions", () => {
	it("should accept valid plugin options", () => {
		const options: ServerActionOptions = {
			apiPrefix: "/api",
			include: ["**/*.server.js", "**/*.server.ts"],
			exclude: ["**/node_modules/**"],
			middleware: [(req: any, res: any, next: any) => next()],
			moduleNameTransform: (filePath: string) => filePath.replace(/\//g, "_"),
			routeTransform: (filePath: string, functionName: string) => `${filePath}/${functionName}`,
			validation: {
				enabled: true,
				adapter: "zod",
			},
			openAPI: {
				enabled: true,
				swaggerUI: true,
				info: {
					title: "My API",
					version: "1.0.0",
					description: "Test API",
				},
				docsPath: "/docs",
				specPath: "/openapi.json",
			},
		};

		// This should compile without errors
		const plugin = serverActions(options);
		expect(plugin.name).toBe("vite-plugin-server-actions");
	});

	it("should provide typing for middleware", () => {
		const loggingMiddleware: RequestHandler = middleware.logging;
		expect(typeof loggingMiddleware).toBe("function");
	});

	it("should provide typing for pathUtils", () => {
		const cleanRoute: string = pathUtils.createCleanRoute("src/actions/todo.server.js", "create");
		const legacyRoute: string = pathUtils.createLegacyRoute("src/actions/todo.server.js", "create");
		const minimalRoute: string = pathUtils.createMinimalRoute("src/actions/todo.server.js", "create");
		const moduleName: string = pathUtils.createModuleName("src/actions/todo.server.js");

		expect(cleanRoute).toBe("actions/todo/create");
		expect(legacyRoute).toBe("src_actions_todo/create");
		expect(minimalRoute).toBe("src/actions/todo.server/create");
		expect(moduleName).toBe("src_actions_todo");
	});

	it("should provide typing for validation components", () => {
		const schemaDiscovery = new SchemaDiscovery();
		const zodAdapter = new ZodAdapter();

		// Test schema discovery
		const testSchema = z.object({ name: z.string() });
		schemaDiscovery.registerSchema("module", "function", testSchema);
		expect(schemaDiscovery.getSchema("module", "function")).toBe(testSchema);

		// Test adapter
		expect(adapters.zod).toBe(ZodAdapter);

		// Test validation middleware creation
		const validationMiddleware = createValidationMiddleware({ schemaDiscovery });
		expect(typeof validationMiddleware).toBe("function");
	});

	it("should provide typing for OpenAPI generator", () => {
		const generator = new OpenAPIGenerator({
			info: {
				title: "Test API",
				version: "1.0.0",
			},
		});

		expect(generator).toBeInstanceOf(OpenAPIGenerator);
	});

	it("should handle optional properties correctly", () => {
		// Minimal config should work
		const minimalPlugin = serverActions();
		expect(minimalPlugin.name).toBe("vite-plugin-server-actions");

		// Empty config should work
		const emptyConfigPlugin = serverActions({});
		expect(emptyConfigPlugin.name).toBe("vite-plugin-server-actions");
	});

	it("should enforce correct types for validation options", () => {
		const validationOptions: ValidationOptions = {
			enabled: true,
			adapter: "zod", // Should only accept "zod"
		};

		const openAPIOptions: OpenAPIOptions = {
			enabled: true,
			swaggerUI: false,
			info: {
				title: "API",
				version: "2.0.0",
				description: "Description",
			},
			docsPath: "/api-docs",
			specPath: "/spec.json",
		};

		const plugin = serverActions({
			validation: validationOptions,
			openAPI: openAPIOptions,
		});
		expect(plugin.name).toBe("vite-plugin-server-actions");
	});
});

// Type tests for server action files
describe("TypeScript server action examples", () => {
	it("should support typed server actions with Zod schemas", () => {
		// Example of what a typed server action would look like
		const todoSchema = {
			input: z.object({
				text: z.string().min(1),
				priority: z.enum(["low", "medium", "high"]).optional(),
			}),
			output: z.object({
				id: z.number(),
				text: z.string(),
				priority: z.string(),
				completed: z.boolean(),
			}),
		};

		type TodoInput = z.infer<typeof todoSchema.input>;
		type TodoOutput = z.infer<typeof todoSchema.output>;

		async function createTodo(input: TodoInput): Promise<TodoOutput> {
			return {
				id: Date.now(),
				text: input.text,
				priority: input.priority || "medium",
				completed: false,
			};
		}

		// Type checking
		expect(async () => {
			const result = await createTodo({ text: "Test todo" });
			expect(result.id).toBeTypeOf("number");
			expect(result.text).toBeTypeOf("string");
			expect(result.priority).toBeTypeOf("string");
			expect(result.completed).toBeTypeOf("boolean");
		}).not.toThrow();
	});
});
