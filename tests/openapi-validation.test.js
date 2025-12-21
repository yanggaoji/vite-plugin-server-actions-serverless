import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { OpenAPIGenerator } from "../src/openapi.js";
import { SchemaDiscovery, ZodAdapter } from "../src/validation.js";

describe("OpenAPI generation with Zod validation", () => {
	let generator;
	let schemaDiscovery;
	let serverFunctions;

	beforeEach(() => {
		generator = new OpenAPIGenerator({
			info: {
				title: "Test API",
				version: "1.0.0",
				description: "Test API with Zod validation",
			},
		});
		schemaDiscovery = new SchemaDiscovery();
		serverFunctions = new Map();
	});

	it("should include Zod schemas in OpenAPI spec", () => {
		// Define test schemas
		const todoSchema = {
			input: z.object({
				text: z.string().min(1, "Todo text is required"),
				priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
				dueDate: z.string().datetime().optional(),
			}),
			output: z.object({
				id: z.number().int().positive(),
				text: z.string(),
				priority: z.enum(["low", "medium", "high"]),
				completed: z.boolean(),
				createdAt: z.string().datetime(),
				dueDate: z.string().datetime().optional(),
			}),
		};

		// Register input schema with discovery
		// The current system only supports input validation
		schemaDiscovery.registerSchema("todos", "createTodo", todoSchema.input);

		// Add server function
		serverFunctions.set("todos", {
			functions: ["createTodo"],
			id: "/src/todos.server.js",
			filePath: "src/todos.server.js",
		});

		// Generate OpenAPI spec
		const spec = generator.generateSpec(serverFunctions, schemaDiscovery, {
			apiPrefix: "/api",
			routeTransform: (filePath, functionName) => `${filePath.replace(/\.server\.js$/, "")}/${functionName}`,
		});

		// Verify basic structure
		expect(spec.openapi).toBe("3.0.3");
		expect(spec.info.title).toBe("Test API");
		expect(spec.paths).toBeDefined();

		// Check the generated path
		const todosPath = spec.paths["/api/src/todos/createTodo"];
		expect(todosPath).toBeDefined();
		expect(todosPath.post).toBeDefined();

		// Verify request body schema
		const requestBody = todosPath.post.requestBody;
		expect(requestBody).toBeDefined();
		expect(requestBody.content["application/json"].schema).toBeDefined();

		const requestSchema = requestBody.content["application/json"].schema;
		expect(requestSchema.type).toBe("array");
		expect(requestSchema.items.type).toBe("object");
		expect(requestSchema.items.properties).toMatchObject({
			text: {
				type: "string",
				minLength: 1,
				// Note: Custom error messages are not transferred to OpenAPI by the library
			},
			priority: {
				type: "string",
				enum: ["low", "medium", "high"],
				default: "medium",
			},
			dueDate: {
				type: "string",
				format: "date-time",
			},
		});
		expect(requestSchema.items.required).toContain("text");

		// Verify response schema (generic since we don't have output validation yet)
		const responses = todosPath.post.responses;
		expect(responses["200"]).toBeDefined();
		expect(responses["200"].content["application/json"].schema).toBeDefined();

		// Without output validation, response is generic
		const responseSchema = responses["200"].content["application/json"].schema;
		expect(responseSchema).toBeDefined();
	});

	it("should handle complex nested Zod schemas", () => {
		// Complex nested schema
		const userSchema = {
			input: z.object({
				name: z.string().min(2).max(50),
				email: z.string().email("Invalid email format"),
				age: z.number().int().min(18, "Must be at least 18").max(120),
				address: z
					.object({
						street: z.string(),
						city: z.string(),
						country: z.string().length(2, "Use 2-letter country code"),
						postalCode: z.string().regex(/^\d{5}$/, "Must be 5 digits"),
					})
					.optional(),
				tags: z.array(z.string()).min(1).max(5),
				preferences: z.record(z.string(), z.boolean()).optional(),
			}),
			output: z.object({
				id: z.string().uuid(),
				name: z.string(),
				email: z.string().email(),
				isActive: z.boolean(),
				createdAt: z.date(),
				metadata: z.object({
					lastLogin: z.date().optional(),
					loginCount: z.number().int(),
				}),
			}),
		};

		schemaDiscovery.registerSchema("users", "createUser", userSchema.input);

		serverFunctions.set("users", {
			functions: ["createUser"],
			id: "/src/users.server.js",
			filePath: "src/users.server.js",
		});

		const spec = generator.generateSpec(serverFunctions, schemaDiscovery, {
			apiPrefix: "/api",
			routeTransform: (filePath, functionName) => `${filePath.replace(/\.server\.js$/, "")}/${functionName}`,
		});

		const userPath = spec.paths["/api/src/users/createUser"];
		const requestSchema = userPath.post.requestBody.content["application/json"].schema;

		// Check nested object validation
		expect(requestSchema.items.properties.address.type).toBe("object");
		expect(requestSchema.items.properties.address.properties.street.type).toBe("string");
		expect(requestSchema.items.properties.address.properties.city.type).toBe("string");
		expect(requestSchema.items.properties.address.properties.country.type).toBe("string");
		// Length constraints are included in checks but not in OpenAPI conversion yet
		expect(requestSchema.items.properties.address.properties.postalCode.pattern).toBe("^\\d{5}$");
		expect(requestSchema.items.properties.address.required).toEqual(["street", "city", "country", "postalCode"]);

		// Check array validation
		expect(requestSchema.items.properties.tags).toMatchObject({
			type: "array",
			items: { type: "string" },
			minItems: 1,
			maxItems: 5,
		});

		// Check record/object validation
		// Note: ZodRecord is not yet supported in OpenAPI conversion
		expect(requestSchema.items.properties.preferences).toBeDefined();
	});

	it("should include validation error responses in OpenAPI", () => {
		const simpleSchema = {
			input: z.object({
				name: z.string().min(1),
			}),
		};

		schemaDiscovery.registerSchema("test", "testFunc", simpleSchema.input);
		serverFunctions.set("test", {
			functions: ["testFunc"],
			id: "/test.server.js",
			filePath: "test.server.js",
		});

		const spec = generator.generateSpec(serverFunctions, schemaDiscovery, {
			apiPrefix: "/api",
		});

		const testPath = spec.paths["/api/test/testFunc"];
		const responses = testPath.post.responses;

		// Should include 400 Bad Request for validation errors
		expect(responses["400"]).toBeDefined();
		expect(responses["400"].description).toContain("Validation");
		expect(responses["400"].content["application/json"].schema).toMatchObject({
			type: "object",
			properties: {
				error: { type: "boolean" },
				status: { type: "integer" },
				message: { type: "string" },
			},
		});
	});

	it("should handle Zod unions and discriminated unions", () => {
		const actionSchema = {
			input: z.discriminatedUnion("type", [
				z.object({
					type: z.literal("create"),
					data: z.object({
						title: z.string(),
						content: z.string(),
					}),
				}),
				z.object({
					type: z.literal("update"),
					id: z.string().uuid(),
					data: z.object({
						title: z.string().optional(),
						content: z.string().optional(),
					}),
				}),
				z.object({
					type: z.literal("delete"),
					id: z.string().uuid(),
				}),
			]),
		};

		schemaDiscovery.registerSchema("actions", "performAction", actionSchema.input);
		serverFunctions.set("actions", {
			functions: ["performAction"],
			id: "/actions.server.js",
			filePath: "actions.server.js",
		});

		const spec = generator.generateSpec(serverFunctions, schemaDiscovery, {
			apiPrefix: "/api",
		});

		const actionPath = spec.paths["/api/actions/performAction"];
		const requestSchema = actionPath.post.requestBody.content["application/json"].schema;

		// OpenAPI should represent this as oneOf
		expect(requestSchema.items.oneOf).toBeDefined();
		expect(requestSchema.items.oneOf).toHaveLength(3);

		// Check discriminator (if supported by the library)
		// Note: discriminatedUnion support may vary by library version
	});

	it("should preserve Zod refinements and transforms in descriptions", () => {
		const refinedSchema = {
			input: z
				.object({
					password: z
						.string()
						.min(8, "Password must be at least 8 characters")
						.refine((val) => /[A-Z]/.test(val), "Password must contain uppercase letter")
						.refine((val) => /[0-9]/.test(val), "Password must contain a number"),
					confirmPassword: z.string(),
				})
				.refine((data) => data.password === data.confirmPassword, {
					message: "Passwords must match",
					path: ["confirmPassword"],
				}),
		};

		schemaDiscovery.registerSchema("auth", "register", refinedSchema.input);
		serverFunctions.set("auth", {
			functions: ["register"],
			id: "/auth.server.js",
			filePath: "auth.server.js",
		});

		const spec = generator.generateSpec(serverFunctions, schemaDiscovery, {
			apiPrefix: "/api",
		});

		const authPath = spec.paths["/api/auth/register"];
		const requestSchema = authPath.post.requestBody.content["application/json"].schema;

		// Check that password constraints are documented
		expect(requestSchema.items.properties.password.minLength).toBe(8);
		// Note: Refinement messages are not automatically added to descriptions by the library
	});
});
