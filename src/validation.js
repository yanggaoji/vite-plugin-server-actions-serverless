import { z } from "zod";
import { createErrorResponse } from "./security.js";
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

/**
 * Base validation adapter interface
 */
export class ValidationAdapter {
	/**
	 * Validate data against a schema
	 * @param {any} schema - The validation schema
	 * @param {any} data - The data to validate
	 * @returns {Promise<{success: boolean, data?: any, errors?: any[]}>}
	 */
	async validate(schema, data) {
		throw new Error("ValidationAdapter.validate must be implemented");
	}

	/**
	 * Convert schema to OpenAPI schema format
	 * @param {any} schema - The validation schema
	 * @returns {object} OpenAPI schema object
	 */
	toOpenAPISchema(schema) {
		throw new Error("ValidationAdapter.toOpenAPISchema must be implemented");
	}

	/**
	 * Get parameter definitions for OpenAPI
	 * @param {any} schema - The validation schema
	 * @returns {Array} Array of OpenAPI parameter objects
	 */
	getParameters(schema) {
		throw new Error("ValidationAdapter.getParameters must be implemented");
	}
}

/**
 * Zod validation adapter
 */
export class ZodAdapter extends ValidationAdapter {
	async validate(schema, data) {
		try {
			const validatedData = await schema.parseAsync(data);
			return {
				success: true,
				data: validatedData,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					success: false,
					errors: error.errors.map((err) => ({
						path: err.path.join("."),
						message: err.message,
						code: err.code,
						value: err.input,
					})),
				};
			}
			return {
				success: false,
				errors: [
					{
						path: "root",
						message: error.message,
						code: "unknown",
					},
				],
			};
		}
	}

	toOpenAPISchema(schema) {
		try {
			// Use @asteasolutions/zod-to-openapi for conversion
			const registry = new OpenAPIRegistry();
			const schemaName = "_TempSchema";

			// The library requires schemas to be registered with openapi metadata
			// For simple conversion, we'll create a temporary registry
			const extendedSchema = schema.openapi ? schema : schema;
			registry.register(schemaName, extendedSchema);

			// Generate the OpenAPI components
			const generator = new OpenApiGeneratorV3(registry.definitions);
			const components = generator.generateComponents();

			// Extract the schema from components
			const openAPISchema = components.components?.schemas?.[schemaName];

			if (!openAPISchema) {
				// Fallback for schemas that couldn't be converted
				return { type: "object", description: "Schema conversion not supported" };
			}

			return openAPISchema;
		} catch (error) {
			console.warn(`Failed to convert Zod schema to OpenAPI: ${error.message}`);
			return { type: "object", description: "Schema conversion failed" };
		}
	}

	getParameters(schema) {
		if (!schema || typeof schema._def === "undefined") {
			return [];
		}

		// For function parameters, we expect an array schema or object schema
		if (schema._def.typeName === "ZodArray") {
			// Array of parameters - convert each item to a parameter
			const itemSchema = schema._def.type;
			return this._schemaToParameters(itemSchema, "body");
		} else if (schema._def.typeName === "ZodObject") {
			// Object parameters - convert each property to a parameter
			return this._objectToParameters(schema);
		}

		return [
			{
				name: "data",
				in: "body",
				required: true,
				schema: this.toOpenAPISchema(schema),
			},
		];
	}

	_objectToParameters(zodObject) {
		const shape = zodObject._def.shape();
		const parameters = [];

		for (const [key, value] of Object.entries(shape)) {
			parameters.push({
				name: key,
				in: "body",
				required: !value.isOptional(),
				schema: this.toOpenAPISchema(value),
				description: value.description || `Parameter: ${key}`,
			});
		}

		return parameters;
	}

	_schemaToParameters(schema, location = "body") {
		return [
			{
				name: "data",
				in: location,
				required: true,
				schema: this.toOpenAPISchema(schema),
			},
		];
	}
}

/**
 * Schema discovery utilities
 */
export class SchemaDiscovery {
	constructor(adapter = new ZodAdapter()) {
		this.adapter = adapter;
		this.schemas = new Map();
	}

	/**
	 * Register a schema for a function
	 * @param {string} moduleName - Module name
	 * @param {string} functionName - Function name
	 * @param {any} schema - Validation schema
	 */
	registerSchema(moduleName, functionName, schema) {
		const key = `${moduleName}.${functionName}`;
		this.schemas.set(key, schema);
	}

	/**
	 * Get schema for a function
	 * @param {string} moduleName - Module name
	 * @param {string} functionName - Function name
	 * @returns {any|null} Schema or null if not found
	 */
	getSchema(moduleName, functionName) {
		const key = `${moduleName}.${functionName}`;
		return this.schemas.get(key) || null;
	}

	/**
	 * Get all schemas
	 * @returns {Map} All registered schemas
	 */
	getAllSchemas() {
		return new Map(this.schemas);
	}

	/**
	 * Discover schemas from module exports
	 * @param {object} module - Module with exported functions
	 * @param {string} moduleName - Module name
	 */
	discoverFromModule(module, moduleName) {
		for (const [functionName, fn] of Object.entries(module)) {
			if (typeof fn === "function") {
				// Check if function has attached schema
				if (fn.schema) {
					this.registerSchema(moduleName, functionName, fn.schema);
				}

				// Check for JSDoc schema annotations (future enhancement)
				// This would require parsing JSDoc comments from the function
			}
		}
	}

	/**
	 * Clear all schemas
	 */
	clear() {
		this.schemas.clear();
	}
}

/**
 * Validation middleware factory
 */
export function createValidationMiddleware(options = {}) {
	const adapter = options.adapter || new ZodAdapter();
	const schemaDiscovery = options.schemaDiscovery || new SchemaDiscovery(adapter);

	return async function validationMiddleware(req, res, next) {
		let moduleName, functionName, schema;

		// Check for context from route setup
		if (req.validationContext) {
			moduleName = req.validationContext.moduleName;
			functionName = req.validationContext.functionName;
			schema = req.validationContext.schema;
		} else {
			// Fallback to URL parsing and schema discovery
			const urlParts = req.url.split("/");
			functionName = urlParts[urlParts.length - 1];
			moduleName = urlParts[urlParts.length - 2];
			schema = schemaDiscovery.getSchema(moduleName, functionName);
		}

		if (!schema) {
			// No schema defined, skip validation
			return next();
		}

		try {
			// Request body should be an array of arguments for server functions
			if (!Array.isArray(req.body) || req.body.length === 0) {
				return res
					.status(400)
					.json(
						createErrorResponse(
							400,
							"Request body must be a non-empty array of function arguments",
							"INVALID_REQUEST_BODY",
						),
					);
			}

			// Validate based on schema type
			let validationData;
			if (schema._def?.typeName === "ZodTuple") {
				// Schema expects multiple arguments (tuple)
				validationData = req.body;
			} else {
				// Schema expects single argument (first element of array)
				validationData = req.body[0];
			}

			const result = await adapter.validate(schema, validationData);

			if (!result.success) {
				return res
					.status(400)
					.json(createErrorResponse(400, "Validation failed", "VALIDATION_ERROR", { validationErrors: result.errors }));
			}

			// Replace request body with validated data
			if (schema._def?.typeName === "ZodTuple") {
				req.body = result.data;
			} else {
				req.body = [result.data];
			}

			next();
		} catch (error) {
			console.error("Validation middleware error:", error);
			res
				.status(500)
				.json(
					createErrorResponse(
						500,
						"Internal validation error",
						"VALIDATION_INTERNAL_ERROR",
						process.env.NODE_ENV !== "production" ? { message: error.message, stack: error.stack } : null,
					),
				);
		}
	};
}

// Export default adapters and utilities
export const adapters = {
	zod: ZodAdapter,
};

export const defaultAdapter = new ZodAdapter();
export const defaultSchemaDiscovery = new SchemaDiscovery(defaultAdapter);
