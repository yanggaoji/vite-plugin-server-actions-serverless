import swaggerUi from "swagger-ui-express";
import { defaultAdapter } from "./validation.js";

/**
 * OpenAPI specification generator
 */
export class OpenAPIGenerator {
	constructor(options = {}) {
		this.adapter = options.adapter || defaultAdapter;
		this.info = {
			title: "Server Actions API",
			version: "1.0.0",
			description: "Auto-generated API documentation for Vite Server Actions",
			...options.info,
		};
		this.servers = options.servers || [
			{
				url: "http://localhost:5173",
				description: "Development server",
			},
		];
	}

	/**
	 * Generate complete OpenAPI specification
	 * @param {Map} serverFunctions - Map of server functions
	 * @param {SchemaDiscovery} schemaDiscovery - Schema discovery instance
	 * @param {object} options - Generation options
	 * @returns {object} Complete OpenAPI 3.0 specification
	 */
	generateSpec(serverFunctions, schemaDiscovery, options = {}) {
		const spec = {
			openapi: "3.0.3",
			info: this.info,
			servers: this.servers,
			paths: {},
			components: {
				schemas: {},
			},
		};

		// Generate paths for each server function
		for (const [moduleName, { functions, filePath }] of serverFunctions) {
			for (const functionName of functions) {
				// Use routeTransform if provided, otherwise fall back to legacy format
				let routePath;
				if (options.routeTransform && filePath) {
					routePath = options.routeTransform(filePath, functionName);
				} else {
					// Fallback to legacy format for backward compatibility
					routePath = `${moduleName}/${functionName}`;
				}

				const path = `${options.apiPrefix || "/api"}/${routePath}`;
				const schema = schemaDiscovery.getSchema(moduleName, functionName);

				spec.paths[path] = this.generatePathItem(moduleName, functionName, schema);
			}
		}

		return spec;
	}

	/**
	 * Generate OpenAPI path item for a server function
	 * @param {string} moduleName - Module name
	 * @param {string} functionName - Function name
	 * @param {any} schema - Validation schema
	 * @returns {object} OpenAPI path item
	 */
	generatePathItem(moduleName, functionName, schema) {
		const operationId = `${moduleName}_${functionName}`;
		const tags = [moduleName];

		const pathItem = {
			post: {
				operationId,
				tags,
				summary: `Execute ${functionName}`,
				description: `Execute the ${functionName} server action from ${moduleName} module`,
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: this.generateRequestSchema(schema),
						},
					},
				},
				responses: {
					200: {
						description: "Successful response",
						content: {
							"application/json": {
								schema: {
									type: "object",
									description: "Function result",
								},
							},
						},
					},
					400: {
						description: "Validation error",
						content: {
							"application/json": {
								schema: this.getErrorSchema(),
							},
						},
					},
					404: {
						description: "Function not found",
						content: {
							"application/json": {
								schema: this.getErrorSchema(),
							},
						},
					},
					500: {
						description: "Internal server error",
						content: {
							"application/json": {
								schema: this.getErrorSchema(),
							},
						},
					},
				},
			},
		};

		return pathItem;
	}

	/**
	 * Generate request schema for a server function
	 * @param {any} schema - Validation schema
	 * @returns {object} OpenAPI schema for request body
	 */
	generateRequestSchema(schema) {
		if (!schema) {
			return {
				type: "array",
				description: "Function arguments array",
				items: {
					type: "object",
					description: "Function argument",
				},
			};
		}

		// Server functions receive arguments as an array
		// But if schema is defined, we assume it validates the first argument
		return {
			type: "array",
			description: "Function arguments",
			items: this.adapter.toOpenAPISchema(schema),
		};
	}

	/**
	 * Get standard error response schema
	 * @returns {object} OpenAPI error schema
	 */
	getErrorSchema() {
		return {
			type: "object",
			properties: {
				error: {
					type: "string",
					description: "Error message",
				},
				details: {
					type: "string",
					description: "Error details",
				},
				validationErrors: {
					type: "array",
					description: "Validation errors (if applicable)",
					items: {
						type: "object",
						properties: {
							path: {
								type: "string",
								description: "Field path",
							},
							message: {
								type: "string",
								description: "Error message",
							},
							code: {
								type: "string",
								description: "Error code",
							},
						},
					},
				},
			},
			required: ["error"],
		};
	}
}

/**
 * Create Swagger UI middleware
 * @param {object} openAPISpec - OpenAPI specification
 * @param {object} options - Swagger UI options
 * @returns {Array} Array of middleware functions
 */
export function createSwaggerMiddleware(openAPISpec, options = {}) {
	const swaggerOptions = {
		customCss: `
			.swagger-ui .topbar { display: none; }
			.swagger-ui .info .title { color: #3b82f6; }
		`,
		customSiteTitle: "Server Actions API Documentation",
		...options.swaggerOptions,
	};

	return [swaggerUi.serve, swaggerUi.setup(openAPISpec, swaggerOptions)];
}

/**
 * Setup OpenAPI endpoints for development
 * @param {Express} app - Express app instance
 * @param {object} openAPISpec - OpenAPI specification
 * @param {object} options - Setup options
 */
export function setupOpenAPIEndpoints(app, openAPISpec, options = {}) {
	const docsPath = options.docsPath || "/api/docs";
	const specPath = options.specPath || "/api/openapi.json";

	// Serve OpenAPI specification as JSON
	app.get(specPath, (req, res) => {
		res.json(openAPISpec);
	});

	// Serve Swagger UI
	if (options.enableSwaggerUI !== false) {
		const swaggerMiddleware = createSwaggerMiddleware(openAPISpec, options);
		app.use(docsPath, ...swaggerMiddleware);

		console.log(`📖 API Documentation: http://localhost:${process.env.PORT || 5173}${docsPath}`);
		console.log(`📄 OpenAPI Spec: http://localhost:${process.env.PORT || 5173}${specPath}`);
	}
}

/**
 * Generate OpenAPI-compatible parameter descriptions from JSDoc
 * @param {string} jsdoc - JSDoc comment string
 * @returns {Array} Array of parameter descriptions
 */
export function parseJSDocParameters(jsdoc) {
	if (!jsdoc) {
		return [];
	}

	const paramRegex = /@param\s+\{([^}]+)\}\s+(\[?[\w.]+\]?)\s*-?\s*(.*)/g;
	const parameters = [];
	let match;

	while ((match = paramRegex.exec(jsdoc)) !== null) {
		const [, type, name, description] = match;
		const isOptional = name.startsWith("[") && name.endsWith("]");
		const paramName = name.replace(/^\[|\]$/g, "");

		parameters.push({
			name: paramName,
			type: type.toLowerCase(),
			description: description.trim(),
			required: !isOptional,
		});
	}

	return parameters;
}

/**
 * Enhanced OpenAPI generator with JSDoc support
 */
export class EnhancedOpenAPIGenerator extends OpenAPIGenerator {
	/**
	 * Generate path item with JSDoc enhancement
	 * @param {string} moduleName - Module name
	 * @param {string} functionName - Function name
	 * @param {any} schema - Validation schema
	 * @param {string} jsdoc - JSDoc comment
	 * @returns {object} Enhanced OpenAPI path item
	 */
	generatePathItemWithJSDoc(moduleName, functionName, schema, jsdoc) {
		const pathItem = this.generatePathItem(moduleName, functionName, schema);

		if (jsdoc) {
			const jsDocParams = parseJSDocParameters(jsdoc);

			// Extract description from JSDoc
			const descriptionMatch = jsdoc.match(/\/\*\*\s*\n\s*\*\s*([^@\n]*)/);
			if (descriptionMatch) {
				pathItem.post.description = descriptionMatch[1].trim();
			}

			// Enhance request schema with JSDoc information
			if (jsDocParams.length > 0 && !schema) {
				pathItem.post.requestBody.content["application/json"].schema = {
					type: "array",
					description: "Function arguments",
					items: this.generateSchemaFromJSDoc(jsDocParams),
				};
			}
		}

		return pathItem;
	}

	/**
	 * Generate OpenAPI schema from JSDoc parameters
	 * @param {Array} jsDocParams - JSDoc parameter descriptions
	 * @returns {object} OpenAPI schema
	 */
	generateSchemaFromJSDoc(jsDocParams) {
		if (jsDocParams.length === 1) {
			// Single parameter
			return this.jsDocTypeToOpenAPISchema(jsDocParams[0]);
		}

		// Multiple parameters - create object schema
		const properties = {};
		const required = [];

		for (const param of jsDocParams) {
			properties[param.name] = this.jsDocTypeToOpenAPISchema(param);
			if (param.required) {
				required.push(param.name);
			}
		}

		return {
			type: "object",
			properties,
			required: required.length > 0 ? required : undefined,
		};
	}

	/**
	 * Convert JSDoc type to OpenAPI schema
	 * @param {object} param - JSDoc parameter object
	 * @returns {object} OpenAPI schema
	 */
	jsDocTypeToOpenAPISchema(param) {
		const { type, description } = param;

		switch (type.toLowerCase()) {
			case "string":
				return { type: "string", description };
			case "number":
				return { type: "number", description };
			case "boolean":
				return { type: "boolean", description };
			case "object":
				return { type: "object", description };
			case "array":
				return { type: "array", items: { type: "object" }, description };
			default:
				// Handle union types like 'low'|'medium'|'high'
				if (type.includes("|")) {
					const enumValues = type.split("|").map((v) => v.replace(/['"]/g, "").trim());
					return { type: "string", enum: enumValues, description };
				}
				return { type: "object", description };
		}
	}
}
