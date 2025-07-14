import { createRequire } from "module";
import { pathToFileURL } from "url";
import fs from "fs/promises";

/**
 * Extract schemas from server modules during build time
 */
export async function extractSchemas(serverFunctions) {
	const schemas = {};

	for (const [moduleName, { id, functions }] of serverFunctions) {
		schemas[moduleName] = {};

		try {
			// Import the module to get schemas
			const moduleUrl = pathToFileURL(id).href;
			const module = await import(moduleUrl);

			// Extract schemas from exported functions
			for (const functionName of functions) {
				if (module[functionName] && module[functionName].schema) {
					// We need to serialize the Zod schema
					// For now, we'll store a reference that can be imported
					schemas[moduleName][functionName] = {
						hasSchema: true,
						// We'll need to generate import statements for these
					};
				}
			}
		} catch (error) {
			console.warn(`Failed to extract schemas from ${id}: ${error.message}`);
		}
	}

	return schemas;
}

/**
 * Generate validation setup code for production
 */
export async function generateValidationCode(options, serverFunctions) {
	if (!options.validation?.enabled) {
		return {
			imports: "",
			setup: "",
			middlewareFactory: "",
			validationRuntime: "",
		};
	}

	// Read the validation runtime code that will be embedded
	const validationRuntimePath = new URL("./validation-runtime.js", import.meta.url);
	const validationRuntime = `
// Embedded validation runtime
${await fs.readFile(validationRuntimePath, "utf-8")}
`;

	// Generate setup code
	const setup = `
// Setup validation
const schemaDiscovery = new SchemaDiscovery();
const validationMiddleware = createValidationMiddleware({ schemaDiscovery });

// Register schemas from server actions
${Array.from(serverFunctions.entries())
	.map(([moduleName, { functions }]) => {
		return functions
			.map(
				(fn) => `
if (serverActions.${moduleName}.${fn}.schema) {
  schemaDiscovery.registerSchema('${moduleName}', '${fn}', serverActions.${moduleName}.${fn}.schema);
}`,
			)
			.join("\n");
	})
	.join("\n")}
`;

	// Generate middleware factory
	const middlewareFactory = `
function createContextualValidationMiddleware(moduleName, functionName) {
  return (req, res, next) => {
    req.validationContext = {
      moduleName,
      functionName,
      schema: serverActions[moduleName]?.[functionName]?.schema
    };
    return validationMiddleware(req, res, next);
  };
}
`;

	return {
		imports: "",
		setup,
		middlewareFactory,
		validationRuntime,
	};
}
