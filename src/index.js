import fs from "fs/promises";
import path from "path";
import express from "express";
import { rollup } from "rollup";
import { minimatch } from "minimatch";
import esbuild from "esbuild";
import { middleware } from "./middleware.js";
import { defaultSchemaDiscovery, createValidationMiddleware } from "./validation.js";
import { OpenAPIGenerator, setupOpenAPIEndpoints } from "./openapi.js";
import { generateValidationCode } from "./build-utils.js";
import { extractExportedFunctions, isValidFunctionName } from "./ast-parser.js";
import { generateTypeDefinitions, generateEnhancedClientProxy } from "./type-generator.js";
import { sanitizePath, isValidModuleName, createSecureModuleName, createErrorResponse } from "./security.js";
import { 
	enhanceFunctionNotFoundError, 
	enhanceParsingError, 
	enhanceValidationError,
	enhanceModuleLoadError,
	createDevelopmentWarning 
} from "./error-enhancer.js";
import { 
	validateFunctionSignature, 
	validateFileStructure, 
	createDevelopmentFeedback,
	validateSchemaAttachment 
} from "./dev-validator.js";

// Utility functions for path transformation
export const pathUtils = {
	/**
	 * Default path normalizer - creates underscore-separated module names (preserves original behavior)
	 * @param {string} filePath - Relative file path (e.g., "src/actions/todo.server.js")
	 * @returns {string} - Normalized module name (e.g., "src_actions_todo")
	 */
	createModuleName: (filePath) => {
		return filePath
			.replace(/\//g, "_") // Replace slashes with underscores
			.replace(/\./g, "_") // Replace dots with underscores
			.replace(/_server_(js|ts)$/, ""); // Remove .server.js or .server.ts extension
	},

	/**
	 * Clean route transformer - creates hierarchical paths: /api/actions/todo/create
	 * @param {string} filePath - Relative file path (e.g., "src/actions/todo.server.js")
	 * @param {string} functionName - Function name (e.g., "create")
	 * @returns {string} - Clean route (e.g., "actions/todo/create")
	 */
	createCleanRoute: (filePath, functionName) => {
		const cleanPath = filePath
			.replace(/^src\//, "") // Remove src/ prefix
			.replace(/\.server\.(js|ts)$/, ""); // Remove .server.js or .server.ts suffix
		return `${cleanPath}/${functionName}`;
	},

	/**
	 * Legacy route transformer - creates underscore-separated paths: /api/src_actions_todo/create
	 * @param {string} filePath - Relative file path (e.g., "src/actions/todo.server.js")
	 * @param {string} functionName - Function name (e.g., "create")
	 * @returns {string} - Legacy route (e.g., "src_actions_todo/create")
	 */
	createLegacyRoute: (filePath, functionName) => {
		const legacyPath = filePath
			.replace(/\//g, "_") // Replace slashes with underscores
			.replace(/\.server\.(js|ts)$/, ""); // Remove .server.js or .server.ts extension
		return `${legacyPath}/${functionName}`;
	},

	/**
	 * Minimal route transformer - keeps original structure: /api/actions/todo.server/create
	 * @param {string} filePath - Relative file path (e.g., "actions/todo.server.js")
	 * @param {string} functionName - Function name (e.g., "create")
	 * @returns {string} - Minimal route (e.g., "actions/todo.server/create")
	 */
	createMinimalRoute: (filePath, functionName) => {
		const minimalPath = filePath.replace(/\.(js|ts)$/, ""); // Just remove .js or .ts
		return `${minimalPath}/${functionName}`;
	},
};

const DEFAULT_OPTIONS = {
	apiPrefix: "/api",
	include: ["**/*.server.js", "**/*.server.ts"],
	exclude: [],
	middleware: [],
	moduleNameTransform: pathUtils.createModuleName,
	routeTransform: (filePath, functionName) => {
		// Default to clean hierarchical paths: /api/actions/todo/create
		const cleanPath = filePath
			.replace(/^src\//, "") // Remove src/ prefix
			.replace(/\.server\.(js|ts)$/, ""); // Remove .server.js or .server.ts suffix
		return `${cleanPath}/${functionName}`;
	},
	validation: {
		enabled: false,
		adapter: "zod",
	},
};

function shouldProcessFile(filePath, options) {
	// Normalize the options to arrays
	const includePatterns = Array.isArray(options.include) ? options.include : [options.include];
	const excludePatterns = Array.isArray(options.exclude) ? options.exclude : [options.exclude];

	// Check if file matches any include pattern
	const isIncluded = includePatterns.some((pattern) => minimatch(filePath, pattern));

	// Check if file matches any exclude pattern
	const isExcluded = excludePatterns.length > 0 && excludePatterns.some((pattern) => minimatch(filePath, pattern));

	return isIncluded && !isExcluded;
}

export default function serverActions(userOptions = {}) {
	const options = {
		...DEFAULT_OPTIONS,
		...userOptions,
		validation: { ...DEFAULT_OPTIONS.validation, ...userOptions.validation },
		openAPI: {
			enabled: false,
			info: {
				title: "Server Actions API",
				version: "1.0.0",
				description: "Auto-generated API documentation for Vite Server Actions",
			},
			docsPath: "/api/docs",
			specPath: "/api/openapi.json",
			swaggerUI: true,
			...userOptions.openAPI,
		},
	};

	const serverFunctions = new Map();
	const schemaDiscovery = defaultSchemaDiscovery;
	let app;
	let openAPIGenerator;
	let validationMiddleware = null;
	let viteConfig = null;

	// Initialize OpenAPI generator if enabled
	if (options.openAPI.enabled) {
		openAPIGenerator = new OpenAPIGenerator({
			info: options.openAPI.info,
		});
	}

	// Initialize validation middleware if enabled
	if (options.validation.enabled) {
		validationMiddleware = createValidationMiddleware({
			schemaDiscovery,
		});
	}

	return {
		name: "vite-plugin-server-actions",

		configResolved(config) {
			// Store Vite config for later use
			viteConfig = config;
		},

		configureServer(server) {
			app = express();
			app.use(express.json());

			// Clean up on HMR
			if (server.watcher) {
				server.watcher.on('change', (file) => {
					// If a server file changed, remove it from the map
					if (shouldProcessFile(file, options)) {
						for (const [moduleName, moduleInfo] of serverFunctions.entries()) {
							if (moduleInfo.id === file) {
								serverFunctions.delete(moduleName);
								schemaDiscovery.clear(); // Clear associated schemas
								console.log(`[HMR] Cleaned up server module: ${moduleName}`);
							}
						}
					}
				});
			}

			// Setup dynamic OpenAPI endpoints in development
			if (process.env.NODE_ENV !== "production" && options.openAPI.enabled && openAPIGenerator) {
				// OpenAPI spec endpoint - generates spec dynamically from current serverFunctions
				app.get(options.openAPI.specPath, (req, res) => {
					const openAPISpec = openAPIGenerator.generateSpec(serverFunctions, schemaDiscovery, {
						apiPrefix: options.apiPrefix,
						routeTransform: options.routeTransform,
					});

					// Add a note if no functions are found
					if (serverFunctions.size === 0) {
						openAPISpec.info.description =
							(openAPISpec.info.description || "") +
							"\n\nNote: No server functions found yet. Try refreshing after accessing your app to trigger module loading.";
					}

					res.json(openAPISpec);
				});

				// Swagger UI setup
				if (options.openAPI.swaggerUI) {
					try {
						// Dynamic import swagger-ui-express
						import("swagger-ui-express")
							.then(({ default: swaggerUi }) => {
								const docsPath = options.openAPI.docsPath;

								app.use(
									docsPath,
									swaggerUi.serve,
									swaggerUi.setup(null, {
										swaggerOptions: {
											url: options.openAPI.specPath,
										},
									}),
								);

								// Wait for server to start and get the actual port, then log URLs
								server.httpServer?.on("listening", () => {
									const address = server.httpServer.address();
									const port = address?.port || 5173;
									// Always use localhost for consistent display
									const host = "localhost";

									// Delay to appear after Vite's startup messages
									global.setTimeout(() => {
										if (viteConfig?.logger) {
											console.log(`  \x1b[2;32m➜\x1b[0m  API Docs: http://${host}:${port}${docsPath}`);
											console.log(`  \x1b[2;32m➜\x1b[0m  OpenAPI:  http://${host}:${port}${options.openAPI.specPath}`);
										} else {
											console.log(`📖 API Documentation: http://${host}:${port}${docsPath}`);
											console.log(`📄 OpenAPI Spec: http://${host}:${port}${options.openAPI.specPath}`);
										}
									}, 50); // Small delay to appear after Vite's ready message
								});
							})
							.catch((error) => {
								console.warn("Swagger UI setup failed:", error.message);
							});
					} catch (error) {
						console.warn("Swagger UI setup failed:", error.message);
					}
				}
			}

			server.middlewares.use(app);

			// Show development feedback after server is ready
			if (process.env.NODE_ENV === 'development') {
				server.httpServer?.on("listening", () => {
					// Delay to appear after Vite's startup messages
					global.setTimeout(() => {
						if (serverFunctions.size > 0) {
							console.log(createDevelopmentFeedback(serverFunctions));
						}
					}, 100);
				});
			}
		},

		async resolveId(source, importer) {
			if (importer && shouldProcessFile(source, options)) {
				const resolvedPath = path.resolve(path.dirname(importer), source);
				return resolvedPath;
			}
		},

		async load(id) {
			if (shouldProcessFile(id, options)) {
				try {
					const code = await fs.readFile(id, "utf-8");

					// Sanitize the file path for security
					const sanitizedPath = sanitizePath(id, process.cwd());
					if (!sanitizedPath) {
						throw new Error(`Invalid file path detected: ${id}`);
					}

					let relativePath = path.relative(process.cwd(), sanitizedPath);

					// Normalize path separators
					relativePath = relativePath.replace(/\\/g, "/").replace(/^\//, "");

					// Generate module name for internal use (must be valid identifier)
					const moduleName = createSecureModuleName(options.moduleNameTransform(relativePath));

					// Validate module name
					if (!isValidModuleName(moduleName)) {
						throw new Error(`Invalid server module name: ${moduleName}`);
					}

					// Use AST parser to extract exported functions with detailed information
					const exportedFunctions = extractExportedFunctions(code, id);
					const functions = [];
					const functionDetails = [];

					for (const fn of exportedFunctions) {
						// Skip default exports for now (could be supported in future)
						if (fn.isDefault) {
							console.warn(createDevelopmentWarning(
								"Default Export Skipped",
								`Default exports are not currently supported`,
								{
									filePath: relativePath,
									suggestion: "Use named exports instead: export async function myFunction() {}"
								}
							));
							continue;
						}

						// Validate function name
						if (!isValidFunctionName(fn.name)) {
							console.warn(createDevelopmentWarning(
								"Invalid Function Name",
								`Function name '${fn.name}' is not a valid JavaScript identifier`,
								{
									filePath: relativePath,
									suggestion: "Function names must start with a letter, $, or _ and contain only letters, numbers, $, and _"
								}
							));
							continue;
						}

						// Warn about non-async functions
						if (!fn.isAsync) {
							console.warn(createDevelopmentWarning(
								"Non-Async Function",
								`Function '${fn.name}' is not async. Server actions should typically be async`,
								{
									filePath: relativePath,
									suggestion: "Consider changing to: export async function " + fn.name + "() {}"
								}
							));
						}

						functions.push(fn.name);
						functionDetails.push(fn);
					}

					// Check for duplicate function names within the same module
					const uniqueFunctions = [...new Set(functions)];
					if (uniqueFunctions.length !== functions.length) {
						console.warn(`Duplicate function names detected in ${id}`);
					}

					// Store both simple function names and detailed information
					serverFunctions.set(moduleName, { 
						functions: uniqueFunctions, 
						functionDetails, 
						id, 
						filePath: relativePath 
					});

					// Development-time validation and feedback
					if (process.env.NODE_ENV === 'development') {
						// Validate file structure
						const fileWarnings = validateFileStructure(functionDetails, relativePath);
						fileWarnings.forEach(warning => console.warn(warning));

						// Validate individual function signatures
						functionDetails.forEach(func => {
							const funcWarnings = validateFunctionSignature(func, relativePath);
							funcWarnings.forEach(warning => console.warn(warning));
						});
					}

					// Discover schemas from module if validation is enabled (development only)
					if (options.validation.enabled && process.env.NODE_ENV !== "production") {
						try {
							const module = await import(id);
							schemaDiscovery.discoverFromModule(module, moduleName);
							
							// Validate schema attachment in development
							if (process.env.NODE_ENV === 'development') {
								const schemaWarnings = validateSchemaAttachment(module, uniqueFunctions, relativePath);
								schemaWarnings.forEach(warning => console.warn(warning));
							}
						} catch (error) {
							const enhancedError = enhanceModuleLoadError(id, error);
							console.warn(enhancedError.message);
							
							if (process.env.NODE_ENV === 'development' && enhancedError.suggestions) {
								enhancedError.suggestions.forEach(suggestion => {
									console.info(`  💡 ${suggestion}`);
								});
							}
						}
					}

					// Setup routes in development mode only
					if (process.env.NODE_ENV !== "production" && app) {
						// Normalize middleware to array (create a fresh copy to avoid mutation)
						const middlewares = Array.isArray(options.middleware)
							? [...options.middleware] // Create a copy
							: options.middleware
								? [options.middleware]
								: [];

						// Add validation middleware if enabled
						if (validationMiddleware) {
							middlewares.push(validationMiddleware);
						}

						uniqueFunctions.forEach((functionName) => {
							const routePath = options.routeTransform(relativePath, functionName);
							const endpoint = `${options.apiPrefix}/${routePath}`;

							// Create a context-aware validation middleware if validation is enabled
							const contextMiddlewares = [...middlewares];
							if (validationMiddleware && options.validation.enabled) {
								// Replace the generic validation middleware with a context-aware one
								const lastIdx = contextMiddlewares.length - 1;
								if (contextMiddlewares[lastIdx] === validationMiddleware) {
									contextMiddlewares[lastIdx] = (req, res, next) => {
										// Add context to request for validation
										// Get the schema directly from schemaDiscovery
										const schema = schemaDiscovery.getSchema(moduleName, functionName);
										req.validationContext = {
											moduleName, // For error messages
											functionName, // For error messages
											schema, // Direct schema access
										};
										return validationMiddleware(req, res, next);
									};
								}
							}

							// Apply middleware before the handler
							app.post(endpoint, ...contextMiddlewares, async (req, res) => {
								try {
									const module = await import(id);

									// Check if function exists in module
									if (typeof module[functionName] !== "function") {
										// Get available functions for better error message
										const availableFunctions = Object.keys(module).filter(key => 
											typeof module[key] === 'function'
										);
										
										const enhancedError = enhanceFunctionNotFoundError(
											functionName, 
											moduleName, 
											availableFunctions
										);
										
										throw new Error(enhancedError.message);
									}

									// Validate request body is array for function arguments
									if (!Array.isArray(req.body)) {
										throw new Error("Request body must be an array of function arguments");
									}

									const result = await module[functionName](...req.body);
									res.json(result || "* No response *");
								} catch (error) {
									console.error(`Error in ${functionName}: ${error.message}`);

									if (error.message.includes("not found") || error.message.includes("not a function")) {
										// Extract available functions from the error context if available
										const availableFunctionsMatch = error.message.match(/Available functions: ([^]+)/);
										const availableFunctions = availableFunctionsMatch 
											? availableFunctionsMatch[1].split(', ')
											: [];
										
										res.status(404).json(createErrorResponse(
											404,
											"Function not found",
											"FUNCTION_NOT_FOUND",
											{ 
												functionName, 
												moduleName,
												availableFunctions: availableFunctions.length > 0 ? availableFunctions : undefined,
												suggestion: `Try one of: ${availableFunctions.join(', ') || 'none available'}`
											}
										));
									} else if (error.message.includes("Request body")) {
										res.status(400).json(createErrorResponse(
											400,
											error.message,
											"INVALID_REQUEST_BODY",
											{ 
												suggestion: "Send an array of arguments: [arg1, arg2, ...]" 
											}
										));
									} else {
										res.status(500).json(createErrorResponse(
											500,
											"Internal server error",
											"INTERNAL_ERROR",
											process.env.NODE_ENV !== 'production' 
												? { 
													message: error.message, 
													stack: error.stack,
													suggestion: "Check server logs for more details"
												} 
												: { suggestion: "Contact support if this persists" }
										));
									}
								}
							});
						});
					}
					// OpenAPI endpoints will be set up during configureServer after all modules are loaded

					// Use enhanced client proxy generator if we have detailed function information
					if (functionDetails.length > 0) {
						return generateEnhancedClientProxy(moduleName, functionDetails, options, relativePath);
					} else {
						// Fallback to basic proxy for backwards compatibility
						return generateClientProxy(moduleName, uniqueFunctions, options, relativePath);
					}
				} catch (error) {
					const enhancedError = enhanceParsingError(id, error);
					console.error(enhancedError.message);
					
					// Provide helpful suggestions in development
					if (process.env.NODE_ENV === 'development' && enhancedError.suggestions.length > 0) {
						console.info('[Vite Server Actions] 💡 Suggestions:');
						enhancedError.suggestions.forEach(suggestion => {
							console.info(`  • ${suggestion}`);
						});
					}
					
					// Return error comment with context instead of failing the build
					return `// Failed to load server actions from ${id}
// Error: ${error.message}
// ${enhancedError.suggestions.length > 0 ? 'Suggestions: ' + enhancedError.suggestions.join(', ') : ''}`;
				}
			}
		},

		transform(code, id) {
			// This hook is not needed since we handle the transformation in the load hook
			// The warning was incorrectly flagging legitimate imports that are being transformed
			return null;
		},

		async generateBundle(outputOptions, bundle) {
			// Create a virtual entry point for all server functions
			const virtualEntryId = "virtual:server-actions-entry";
			let virtualModuleContent = "";
			for (const [moduleName, { id }] of serverFunctions) {
				virtualModuleContent += `import * as ${moduleName} from '${id}';\n`;
			}
			virtualModuleContent += `export { ${Array.from(serverFunctions.keys()).join(", ")} };`;

			// Use Rollup to bundle the virtual module
			const build = await rollup({
				input: virtualEntryId,
				plugins: [
					{
						name: "virtual",
						resolveId(id) {
							if (id === virtualEntryId) {
								return id;
							}
						},
						load(id) {
							if (id === virtualEntryId) {
								return virtualModuleContent;
							}
						},
					},
					{
						name: "typescript-transform",
						async load(id) {
							// Handle TypeScript files
							if (id.endsWith('.ts')) {
								const code = await fs.readFile(id, 'utf-8');
								const result = await esbuild.transform(code, {
									loader: 'ts',
									target: 'node16',
									format: 'esm',
								});
								return result.code;
							}
							return null;
						},
					},
					{
						name: "external-modules",
						resolveId(source) {
							if (!shouldProcessFile(source, options) && !source.startsWith(".") && !path.isAbsolute(source)) {
								return { id: source, external: true };
							}
						},
					},
				],
			});

			const { output } = await build.generate({ format: "es" });

			if (output.length === 0) {
				throw new Error("Failed to bundle server functions");
			}

			const bundledCode = output[0].code;

			// Emit the bundled server functions
			this.emitFile({
				type: "asset",
				fileName: "actions.js",
				source: bundledCode,
			});

			// Generate and emit TypeScript definitions
			const typeDefinitions = generateTypeDefinitions(serverFunctions, options);
			this.emitFile({
				type: "asset",
				fileName: "actions.d.ts",
				source: typeDefinitions,
			});

			// Generate OpenAPI spec if enabled
			let openAPISpec = null;
			if (options.openAPI.enabled) {
				openAPISpec = openAPIGenerator.generateSpec(serverFunctions, schemaDiscovery, {
					apiPrefix: options.apiPrefix,
					routeTransform: options.routeTransform,
				});

				// Emit OpenAPI spec as a separate file
				this.emitFile({
					type: "asset",
					fileName: "openapi.json",
					source: JSON.stringify(openAPISpec, null, 2),
				});
			}

			// Generate validation code if enabled
			const validationCode = await generateValidationCode(options, serverFunctions);

			// Generate server.js
			const serverCode = `
        import express from 'express';
        import * as serverActions from './actions.js';
        ${options.openAPI.enabled && options.openAPI.swaggerUI ? "import swaggerUi from 'swagger-ui-express';" : ""}
        ${options.openAPI.enabled ? "import { readFileSync } from 'fs';\nimport { fileURLToPath } from 'url';\nimport { dirname, join } from 'path';\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\nconst openAPISpec = JSON.parse(readFileSync(join(__dirname, 'openapi.json'), 'utf-8'));" : ""}
        ${validationCode.imports}
        ${validationCode.validationRuntime}

        const app = express();
        ${validationCode.setup}
        ${validationCode.middlewareFactory}

        // Middleware
        // --------------------------------------------------
        app.use(express.json());
        app.use(express.static('dist'));

				// Server functions
				// --------------------------------------------------
        ${Array.from(serverFunctions.entries())
					.flatMap(([moduleName, { functions, filePath }]) =>
						functions
							.map((functionName) => {
								const routePath = options.routeTransform(filePath, functionName);
								const middlewareCall = options.validation?.enabled
									? `createContextualValidationMiddleware('${moduleName}', '${functionName}'), `
									: "";
								return `
            app.post('${options.apiPrefix}/${routePath}', ${middlewareCall}async (req, res) => {
              try {
                const result = await serverActions.${moduleName}.${functionName}(...req.body);
                res.json(result || "* No response *");
              } catch (error) {
                console.error(\`Error in ${functionName}: \${error.message}\`);
                res.status(500).json({ error: error.message });
              }
            });
          `;
							})
							.join("\n")
							.trim(),
					)
					.join("\n")
					.trim()}

				${
					options.openAPI.enabled
						? `
				// OpenAPI endpoints
				// --------------------------------------------------
				app.get('${options.openAPI.specPath}', (req, res) => {
					res.json(openAPISpec);
				});
				
				${
					options.openAPI.swaggerUI
						? `
				// Swagger UI
				app.use('${options.openAPI.docsPath}', swaggerUi.serve, swaggerUi.setup(openAPISpec));
				`
						: ""
				}
				`
						: ""
				}

				// Start server
				// --------------------------------------------------
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
					console.log(\`🚀 Server listening: http://localhost:\${port}\`);
					${
						options.openAPI.enabled
							? `
					console.log(\`📖 API Documentation: http://localhost:\${port}${options.openAPI.docsPath}\`);
					console.log(\`📄 OpenAPI Spec: http://localhost:\${port}${options.openAPI.specPath}\`);
					`
							: ""
					}
				});

        // List all server functions
				// --------------------------------------------------
      `;

			this.emitFile({
				type: "asset",
				fileName: "server.js",
				source: serverCode,
			});
		},
	};
}

function generateClientProxy(moduleName, functions, options, filePath) {
	// Add development-only safety checks
	const isDev = process.env.NODE_ENV !== "production";

	let clientProxy = `\n// vite-server-actions: ${moduleName}\n`;

	// Add a guard to prevent direct imports of server code
	if (isDev) {
		clientProxy += `
// Development-only safety check
if (typeof window !== 'undefined') {
  // This code is running in the browser
  const serverFileError = new Error(
    '[Vite Server Actions] SECURITY WARNING: Server file "${moduleName}" is being imported in client code! ' +
    'This could expose server-side code to the browser. Only import server actions through the plugin.'
  );
  serverFileError.name = 'ServerCodeInClientError';
  
  // Check if we're in a server action proxy context
  if (!window.__VITE_SERVER_ACTIONS_PROXY__) {
    console.error(serverFileError);
    // In development, we'll warn but not throw to avoid breaking HMR
    console.error('Stack trace:', serverFileError.stack);
  }
}
`;
	}

	functions.forEach((functionName) => {
		const routePath = options.routeTransform(filePath, functionName);

		clientProxy += `
      export async function ${functionName}(...args) {
      	console.log("[Vite Server Actions] 🚀 - Executing ${functionName}");
        
        ${
					isDev
						? `
        // Development-only: Mark that we're in a valid proxy context
        if (typeof window !== 'undefined') {
          window.__VITE_SERVER_ACTIONS_PROXY__ = true;
        }
        
        // Validate arguments in development
        if (args.some(arg => typeof arg === 'function')) {
          console.warn(
            '[Vite Server Actions] Warning: Functions cannot be serialized and sent to the server. ' +
            'Function arguments will be converted to null.'
          );
        }
        `
						: ""
				}
        
        try {
          const response = await fetch('${options.apiPrefix}/${routePath}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args)
          });

          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch {
              errorData = { error: 'Unknown error', details: 'Failed to parse error response' };
            }
            
            console.error("[Vite Server Actions] ❗ - Error in ${functionName}:", errorData);
            
            const error = new Error(errorData.error || 'Server request failed');
            error.details = errorData.details;
            error.status = response.status;
            throw error;
          }

          console.log("[Vite Server Actions] ✅ - ${functionName} executed successfully");
          const result = await response.json();
          
          ${
						isDev
							? `
          // Development-only: Clear the proxy context
          if (typeof window !== 'undefined') {
            window.__VITE_SERVER_ACTIONS_PROXY__ = false;
          }
          `
							: ""
					}
          
          return result;
          
        } catch (error) {
          console.error("[Vite Server Actions] ❗ - Network or execution error in ${functionName}:", error.message);
          
          ${
						isDev
							? `
          // Development-only: Clear the proxy context on error
          if (typeof window !== 'undefined') {
            window.__VITE_SERVER_ACTIONS_PROXY__ = false;
          }
          `
							: ""
					}
          
          // Re-throw with more context if it's not already our custom error
          if (!error.details) {
            const networkError = new Error(\`Failed to execute server action '\${functionName}': \${error.message}\`);
            networkError.originalError = error;
            throw networkError;
          }
          
          throw error;
        }
      }
    `;
	});
	return clientProxy;
}

// Export built-in middleware and validation utilities
export { middleware };
export { createValidationMiddleware, ValidationAdapter, ZodAdapter, SchemaDiscovery, adapters } from "./validation.js";
export { OpenAPIGenerator, setupOpenAPIEndpoints, createSwaggerMiddleware } from "./openapi.js";
