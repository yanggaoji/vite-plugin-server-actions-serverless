import { createRequire } from "module";
import { pathToFileURL } from "url";

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
export function generateValidationCode(options, serverFunctions) {
	if (!options.validation?.enabled) {
		return {
			imports: "",
			setup: "",
			middlewareFactory: "",
		};
	}

	// Generate imports
	const imports = `
import { createValidationMiddleware, SchemaDiscovery } from '../../../src/validation.js';
`;

	// Generate schema imports from the bundled actions
	const schemaImports = Array.from(serverFunctions.entries())
		.map(([moduleName, { functions }]) => {
			return functions.map((fn) => `// Import schema for ${moduleName}.${fn} if it exists`).join("\n");
		})
		.join("\n");

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
		imports: imports + schemaImports,
		setup,
		middlewareFactory,
	};
}
