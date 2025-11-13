/**
 * Runtime validation code that gets bundled with the production server
 * This avoids the need for relative imports from src/
 */

/**
 * Simple schema discovery for production
 */
export class SchemaDiscovery {
	constructor() {
		this.schemas = new Map();
	}

	registerSchema(moduleName, functionName, schema) {
		const key = `${moduleName}.${functionName}`;
		this.schemas.set(key, schema);
	}

	getSchema(moduleName, functionName) {
		const key = `${moduleName}.${functionName}`;
		return this.schemas.get(key) || null;
	}

	getAllSchemas() {
		return new Map(this.schemas);
	}
}

/**
 * Validation middleware for production
 */
export function createValidationMiddleware(options = {}) {
	const schemaDiscovery = options.schemaDiscovery || new SchemaDiscovery();

	return async function validationMiddleware(req, res, next) {
		let moduleName, functionName, schema;

		// Check for context from route setup
		if (req.validationContext) {
			moduleName = req.validationContext.moduleName;
			functionName = req.validationContext.functionName;
			schema = req.validationContext.schema;
		}

		if (!schema) {
			// No schema defined, skip validation
			return next();
		}

		try {
			// Request body should be an array of arguments for server functions
			if (!Array.isArray(req.body) || req.body.length === 0) {
				return res.status(400).json({
					error: "Validation failed",
					message: "Request body must be a non-empty array of function arguments",
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

			// Validate request body using Zod
			if (schema.parse) {
				// It's a Zod schema
				const validatedData = await schema.parseAsync(validationData);

				// Replace request body with validated data
				if (schema._def?.typeName === "ZodTuple") {
					req.body = validatedData;
				} else {
					req.body = [validatedData];
				}
			}
			next();
		} catch (error) {
			// Validation failed
			if (error.errors) {
				// Zod validation error
				return res.status(400).json({
					error: "Validation failed",
					details: error.errors,
					message: error.message,
				});
			}

			// Other validation error
			return res.status(400).json({
				error: "Validation failed",
				message: error.message,
			});
		}
	};
}
