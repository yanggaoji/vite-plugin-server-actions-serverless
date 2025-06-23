import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import SwaggerParser from "@apidevtools/swagger-parser";
import { Spectral } from "@stoplight/spectral-core";
import { oas } from "@stoplight/spectral-rulesets";
import { OpenAPIGenerator } from "../src/openapi.js";
import { SchemaDiscovery } from "../src/validation.js";

describe("OpenAPI Kitchen Sink - Comprehensive Validation", () => {
	let generator;
	let schemaDiscovery;
	let serverFunctions;

	beforeEach(() => {
		generator = new OpenAPIGenerator({
			info: {
				title: "Kitchen Sink API",
				version: "1.0.0",
				description: "Comprehensive test API with all possible Zod types and patterns",
				contact: {
					name: "API Support",
					email: "support@example.com",
				},
				license: {
					name: "MIT",
					url: "https://opensource.org/licenses/MIT",
				},
			},
		});
		schemaDiscovery = new SchemaDiscovery();
		serverFunctions = new Map();
	});

	it("should generate valid OpenAPI spec for complex schemas", async () => {
		// Define all possible Zod types and patterns
		const schemas = {
			// Basic types
			basicTypes: z.object({
				string: z.string(),
				number: z.number(),
				integer: z.number().int(),
				boolean: z.boolean(),
				date: z.date(),
				datetime: z.string().datetime(),
				email: z.string().email(),
				url: z.string().url(),
				uuid: z.string().uuid(),
				regex: z.string().regex(/^[A-Z]{2,4}$/),
				literal: z.literal("exact-value"),
				nullable: z.string().nullable(),
				optional: z.string().optional(),
				withDefault: z.string().default("default-value"),
			}),

			// String variations
			stringVariations: z.object({
				minLength: z.string().min(5),
				maxLength: z.string().max(50),
				exactLength: z.string().length(10),
				trimmed: z.string().trim(),
				lowercase: z.string().toLowerCase(),
				uppercase: z.string().toUpperCase(),
				withMessage: z.string().min(3, "Must be at least 3 characters"),
				multipleConstraints: z.string().min(2).max(100).email(),
			}),

			// Number variations
			numberVariations: z.object({
				positive: z.number().positive(),
				negative: z.number().negative(),
				nonpositive: z.number().nonpositive(),
				nonnegative: z.number().nonnegative(),
				multipleOf: z.number().multipleOf(5),
				finite: z.number().finite(),
				safe: z.number().safe(),
				gt: z.number().gt(10),
				gte: z.number().gte(10),
				lt: z.number().lt(100),
				lte: z.number().lte(100),
				intWithRange: z.number().int().min(1).max(100),
			}),

			// Arrays
			arrayTypes: z.object({
				simpleArray: z.array(z.string()),
				minItems: z.array(z.number()).min(1),
				maxItems: z.array(z.string()).max(10),
				exactLength: z.array(z.boolean()).length(5),
				nonempty: z.array(z.string()).nonempty(),
				nestedArrays: z.array(z.array(z.number())),
				mixedTypes: z.array(z.union([z.string(), z.number()])),
			}),

			// Objects and nesting
			nestedObjects: z.object({
				user: z.object({
					id: z.string().uuid(),
					profile: z.object({
						name: z.string(),
						age: z.number().int().positive(),
						address: z.object({
							street: z.string(),
							city: z.string(),
							country: z.string().length(2),
							coordinates: z.object({
								lat: z.number().min(-90).max(90),
								lng: z.number().min(-180).max(180),
							}),
						}),
					}),
					settings: z.record(z.string(), z.boolean()),
					tags: z.set(z.string()),
				}),
			}),

			// Unions and intersections
			unionTypes: z.object({
				simpleUnion: z.union([z.string(), z.number()]),
				discriminatedUnion: z.discriminatedUnion("type", [
					z.object({ type: z.literal("text"), content: z.string() }),
					z.object({ type: z.literal("image"), url: z.string().url(), alt: z.string() }),
					z.object({ type: z.literal("video"), url: z.string().url(), duration: z.number() }),
				]),
				intersection: z.intersection(z.object({ name: z.string() }), z.object({ age: z.number() })),
			}),

			// Enums
			enumTypes: z.object({
				simpleEnum: z.enum(["red", "green", "blue"]),
				nativeEnum: z.nativeEnum({ Admin: "ADMIN", User: "USER", Guest: "GUEST" }),
			}),

			// Tuples
			tupleTypes: z.object({
				simpleTuple: z.tuple([z.string(), z.number()]),
				restTuple: z.tuple([z.string(), z.number()]).rest(z.boolean()),
				namedTuple: z.tuple([z.string(), z.number(), z.boolean()]),
			}),

			// Maps and records
			mapTypes: z.object({
				simpleRecord: z.record(z.string()),
				keyValueRecord: z.record(z.string(), z.number()),
				// Note: z.map() is not supported by the OpenAPI converter
			}),

			// Transforms and refinements
			transformTypes: z.object({
				transformed: z.string().transform((val) => val.length),
				refined: z.string().refine((val) => val.includes("@"), "Must contain @"),
				superRefine: z
					.object({
						password: z.string(),
						confirm: z.string(),
					})
					.superRefine((val, ctx) => {
						if (val.password !== val.confirm) {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								message: "Passwords must match",
								path: ["confirm"],
							});
						}
					}),
			}),

			// Effects and preprocessing (Note: These require special handling)
			/* Skipping these as they need explicit OpenAPI metadata:
      effectTypes: z.object({
        preprocess: z.preprocess(
          (val) => String(val).trim(),
          z.string().min(1)
        ),
        coerced: z.coerce.number(),
        branded: z.string().brand("UserId")
      }),
      */

			// Lazy and recursive types
			/* Recursive types need special handling:
      recursiveType: z.lazy(() => z.object({
        value: z.string(),
        children: z.array(recursiveType).optional()
      })),
      */

			// Promise types
			promiseType: z.promise(z.string()),

			// Any and unknown
			flexibleTypes: z.object({
				anything: z.any(),
				unknown: z.unknown(),
				// Note: z.void() and z.never() need explicit OpenAPI metadata
			}),
		};

		// Register all schemas
		Object.entries(schemas).forEach(([name, schema]) => {
			if (name !== "recursiveType" && name !== "promiseType") {
				// Skip unsupported types
				schemaDiscovery.registerSchema("kitchenSink", name, schema);

				// Add to server functions
				if (!serverFunctions.has("kitchenSink")) {
					serverFunctions.set("kitchenSink", {
						functions: [],
						id: "/src/kitchen-sink.server.js",
						filePath: "src/kitchen-sink.server.js",
					});
				}
				serverFunctions.get("kitchenSink").functions.push(name);
			}
		});

		// Generate OpenAPI spec
		const spec = generator.generateSpec(serverFunctions, schemaDiscovery, {
			apiPrefix: "/api",
			routeTransform: (filePath, functionName) => `${filePath.replace(/\.server\.js$/, "")}/${functionName}`,
		});

		// Validate with swagger-parser
		try {
			const api = await SwaggerParser.validate(spec);
			expect(api).toBeDefined();
			expect(api.openapi).toBe("3.0.3");
			expect(api.info.title).toBe("Kitchen Sink API");
		} catch (error) {
			console.error("OpenAPI validation error:", error);
			throw error;
		}

		// Additional structural validations
		expect(spec.paths).toBeDefined();
		expect(Object.keys(spec.paths).length).toBeGreaterThan(0);

		// Check that complex types are handled
		const basicTypesPath = spec.paths["/api/src/kitchen-sink/basicTypes"];
		expect(basicTypesPath).toBeDefined();
		expect(basicTypesPath.post).toBeDefined();

		const requestSchema = basicTypesPath.post.requestBody.content["application/json"].schema;
		expect(requestSchema.type).toBe("array");
		expect(requestSchema.items.type).toBe("object");

		// Verify some specific type conversions
		const props = requestSchema.items.properties;
		expect(props.string.type).toBe("string");
		expect(props.number.type).toBe("number");
		expect(props.integer.type).toBe("integer");
		expect(props.boolean.type).toBe("boolean");
		expect(props.email.type).toBe("string");
		expect(props.email.format).toBe("email");
		expect(props.uuid.type).toBe("string");
		expect(props.uuid.format).toBe("uuid");
	});

	it("should pass Spectral linting rules", async () => {
		const spectral = new Spectral();
		spectral.setRuleset(oas);

		// Create a simple schema for linting test
		const simpleSchema = z.object({
			id: z.string().uuid(),
			name: z.string().min(1).max(100),
			status: z.enum(["active", "inactive", "pending"]),
		});

		schemaDiscovery.registerSchema("linting", "updateStatus", simpleSchema);
		serverFunctions.set("linting", {
			functions: ["updateStatus"],
			id: "/src/linting.server.js",
			filePath: "src/linting.server.js",
		});

		const spec = generator.generateSpec(serverFunctions, schemaDiscovery, {
			apiPrefix: "/api",
		});

		// Add required OpenAPI fields for better linting
		spec.servers = [
			{ url: "http://localhost:5173", description: "Development server" },
			{ url: "https://api.example.com", description: "Production server" },
		];

		// Run Spectral validation (basic - without custom ruleset)
		try {
			const results = await spectral.run(spec);

			// Filter out info-level messages
			const errors = results.filter((r) => r.severity === 0); // 0 = error
			const warnings = results.filter((r) => r.severity === 1); // 1 = warning

			if (errors.length > 0) {
				console.error("Spectral errors:", errors);
			}

			expect(errors.length).toBe(0);
			// Warnings are acceptable but let's log them
			if (warnings.length > 0) {
				console.log(`Spectral warnings: ${warnings.length}`);
			}
		} catch (error) {
			console.error("Spectral validation error:", error);
			throw error;
		}
	});

	it("should handle edge cases and invalid schemas gracefully", () => {
		// Test with empty schema
		const emptySpec = generator.generateSpec(new Map(), schemaDiscovery, {
			apiPrefix: "/api",
		});

		expect(emptySpec.openapi).toBe("3.0.3");
		expect(emptySpec.paths).toEqual({});

		// Test with schema that might fail conversion
		const problematicSchema = z.object({
			// Circular reference simulation
			self: z.lazy(() => problematicSchema).optional(),
			// Complex transform
			computed: z.string().transform((val) => ({ original: val, length: val.length })),
			// Symbol (not serializable)
			symbol: z.symbol().optional(),
		});

		// This should not throw
		expect(() => {
			schemaDiscovery.registerSchema("edge", "problematic", problematicSchema);
		}).not.toThrow();
	});
});
