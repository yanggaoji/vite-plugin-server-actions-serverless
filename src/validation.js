import { z } from "zod";

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
			// Use zod-to-openapi for conversion
			return this._zodToOpenAPISchema(schema);
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

	_zodToOpenAPISchema(schema) {
		if (!schema || typeof schema._def === "undefined") {
			return { type: "object" };
		}

		const def = schema._def;

		switch (def.typeName) {
			case "ZodString":
				return {
					type: "string",
					description: schema.description,
					...(def.checks && this._getStringConstraints(def.checks)),
				};

			case "ZodNumber":
				return {
					type: "number",
					description: schema.description,
					...(def.checks && this._getNumberConstraints(def.checks)),
				};

			case "ZodBoolean":
				return {
					type: "boolean",
					description: schema.description,
				};

			case "ZodArray":
				return {
					type: "array",
					items: this.toOpenAPISchema(def.type),
					description: schema.description,
				};

			case "ZodObject":
				const properties = {};
				const required = [];

				for (const [key, value] of Object.entries(def.shape())) {
					properties[key] = this.toOpenAPISchema(value);
					if (!value.isOptional()) {
						required.push(key);
					}
				}

				return {
					type: "object",
					properties,
					required: required.length > 0 ? required : undefined,
					description: schema.description,
				};

			case "ZodEnum":
				return {
					type: "string",
					enum: def.values,
					description: schema.description,
				};

			case "ZodOptional":
				return this.toOpenAPISchema(def.innerType);

			case "ZodNullable":
				const baseSchema = this.toOpenAPISchema(def.innerType);
				return {
					...baseSchema,
					nullable: true,
				};

			case "ZodUnion":
				return {
					oneOf: def.options.map((option) => this.toOpenAPISchema(option)),
					description: schema.description,
				};

			case "ZodLiteral":
				return {
					type: typeof def.value,
					enum: [def.value],
					description: schema.description,
				};

			case "ZodTuple":
				return {
					type: "array",
					items: {
						oneOf: def.items.map((item) => this.toOpenAPISchema(item)),
					},
					minItems: def.items.length,
					maxItems: def.items.length,
					description: schema.description,
				};

			default:
				console.warn(`Unsupported Zod type: ${def.typeName}`);
				return {
					type: "object",
					description: schema.description || `Unsupported type: ${def.typeName}`,
				};
		}
	}

	_getStringConstraints(checks) {
		const constraints = {};
		for (const check of checks) {
			switch (check.kind) {
				case "min":
					constraints.minLength = check.value;
					break;
				case "max":
					constraints.maxLength = check.value;
					break;
				case "email":
					constraints.format = "email";
					break;
				case "url":
					constraints.format = "uri";
					break;
				case "regex":
					constraints.pattern = check.regex.source;
					break;
			}
		}
		return constraints;
	}

	_getNumberConstraints(checks) {
		const constraints = {};
		for (const check of checks) {
			switch (check.kind) {
				case "min":
					constraints.minimum = check.value;
					break;
				case "max":
					constraints.maximum = check.value;
					break;
				case "int":
					constraints.type = "integer";
					break;
			}
		}
		return constraints;
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
		// Extract module and function name from URL
		const urlParts = req.url.split("/");
		const functionName = urlParts[urlParts.length - 1];
		const moduleName = urlParts[urlParts.length - 2];

		// Get schema for this function
		const schema = schemaDiscovery.getSchema(moduleName, functionName);

		if (!schema) {
			// No schema defined, skip validation
			return next();
		}

		try {
			// Request body should be an array of arguments for server functions
			if (!Array.isArray(req.body) || req.body.length === 0) {
				return res.status(400).json({
					error: "Validation failed",
					details: "Request body must be a non-empty array of function arguments",
				});
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
				return res.status(400).json({
					error: "Validation failed",
					details: result.errors,
					validationErrors: result.errors,
				});
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
			res.status(500).json({
				error: "Internal validation error",
				details: error.message,
			});
		}
	};
}

// Export default adapters and utilities
export const adapters = {
	zod: ZodAdapter,
};

export const defaultAdapter = new ZodAdapter();
export const defaultSchemaDiscovery = new SchemaDiscovery(defaultAdapter);