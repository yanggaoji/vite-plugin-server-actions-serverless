import fs from "fs/promises";
import path from "path";
import express from "express";
import { rollup } from "rollup";
import { minimatch } from "minimatch";
import { middleware } from "./middleware.js";
import { defaultSchemaDiscovery, createValidationMiddleware } from "./validation.js";
import { OpenAPIGenerator, setupOpenAPIEndpoints } from "./openapi.js";
import { generateValidationCode } from "./build-utils.js";

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
			.replace(/_server_js$/, ""); // Remove .server.js extension
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
			.replace(/\.server\.js$/, ""); // Remove .server.js suffix
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
			.replace(/\.server\.js$/, ""); // Remove .server.js extension
		return `${legacyPath}/${functionName}`;
	},

	/**
	 * Minimal route transformer - keeps original structure: /api/actions/todo.server/create
	 * @param {string} filePath - Relative file path (e.g., "actions/todo.server.js")
	 * @param {string} functionName - Function name (e.g., "create")
	 * @returns {string} - Minimal route (e.g., "actions/todo.server/create")
	 */
	createMinimalRoute: (filePath, functionName) => {
		const minimalPath = filePath.replace(/\.js$/, ""); // Just remove .js
		return `${minimalPath}/${functionName}`;
	},
};

const DEFAULT_OPTIONS = {
	apiPrefix: "/api",
	include: ["**/*.server.js"],
	exclude: [],
	middleware: [],
	moduleNameTransform: pathUtils.createModuleName,
	routeTransform: (filePath, functionName) => {
		// Default to clean hierarchical paths: /api/actions/todo/create
		const cleanPath = filePath
			.replace(/^src\//, "") // Remove src/ prefix
			.replace(/\.server\.js$/, ""); // Remove .server.js suffix
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
											console.log(
												`  \x1b[2;32m➜\x1b[0m  OpenAPI:  http://${host}:${port}${options.openAPI.specPath}`,
											);
										} else {
											console.log(`📖 API Documentation: http://${host}:${port}${docsPath}`);
											console.log(
												`📄 OpenAPI Spec: http://${host}:${port}${options.openAPI.specPath}`,
											);
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

					let relativePath = path.relative(process.cwd(), id);

					// If the file is outside the project root, use the absolute path
					if (relativePath.startsWith("..")) {
						relativePath = id;
					}

					// Normalize path separators
					relativePath = relativePath.replace(/\\/g, "/").replace(/^\//, "");

					// Generate module name for internal use (must be valid identifier)
					const moduleName = options.moduleNameTransform(relativePath);

					// Validate module name
					if (!moduleName || moduleName.includes("..")) {
						throw new Error(`Invalid server module name: ${moduleName}`);
					}

					const exportRegex = /export\s+(async\s+)?function\s+(\w+)/g;
					const functions = [];
					let match;

					while ((match = exportRegex.exec(code)) !== null) {
						const functionName = match[2];

						// Validate function name
						if (!functionName || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(functionName)) {
							console.warn(`Skipping invalid function name: ${functionName} in ${id}`);
							continue;
						}

						functions.push(functionName);
					}

					// Check for duplicate function names within the same module
					const uniqueFunctions = [...new Set(functions)];
					if (uniqueFunctions.length !== functions.length) {
						console.warn(`Duplicate function names detected in ${id}`);
					}

					serverFunctions.set(moduleName, { functions: uniqueFunctions, id, filePath: relativePath });

					// Discover schemas from module if validation is enabled (development only)
					if (options.validation.enabled && process.env.NODE_ENV !== "production") {
						try {
							const module = await import(id);
							schemaDiscovery.discoverFromModule(module, moduleName);
						} catch (error) {
							console.warn(`Failed to discover schemas from ${id}: ${error.message}`);
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
										throw new Error(`Function ${functionName} not found or not a function`);
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
										res.status(404).json({
											error: "Function not found",
											details: error.message,
										});
									} else if (error.message.includes("Request body")) {
										res.status(400).json({
											error: "Bad request",
											details: error.message,
										});
									} else {
										res.status(500).json({
											error: "Internal server error",
											details: error.message,
										});
									}
								}
							});
						});
					}
					// OpenAPI endpoints will be set up during configureServer after all modules are loaded

					return generateClientProxy(moduleName, uniqueFunctions, options, relativePath);
				} catch (error) {
					console.error(`Failed to process server file ${id}: ${error.message}`);
					// Return empty proxy instead of failing the build
					return `// Failed to load server actions from ${id}: ${error.message}`;
				}
			}
		},

		transform(code, id) {
			// Development-only check: Warn if server files are imported in client files
			if (process.env.NODE_ENV !== "production" && !id.endsWith(".server.js")) {
				// Check for suspicious imports of .server.js files
				const serverImportRegex = /import\s+.*?from\s+['"](.*?\.server\.js)['"]/g;
				const matches = code.matchAll(serverImportRegex);

				for (const match of matches) {
					const importPath = match[1];
					console.warn(
						"[Vite Server Actions] ⚠️  WARNING: Direct import of server file detected!\n" +
							`  File: ${id}\n` +
							`  Import: ${match[0]}\n` +
							"  This may expose server-side code to the client. " +
							"Server actions should only be imported through the Vite plugin transformation.",
					);
				}
			}
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
						name: "external-modules",
						resolveId(source) {
							if (!source.endsWith(".server.js") && !source.startsWith(".") && !path.isAbsolute(source)) {
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
			const validationCode = generateValidationCode(options, serverFunctions);

			// Generate server.js
			const serverCode = `
        import express from 'express';
        import * as serverActions from './actions.js';
        ${options.openAPI.enabled && options.openAPI.swaggerUI ? "import swaggerUi from 'swagger-ui-express';" : ""}
        ${options.openAPI.enabled ? "import { readFileSync } from 'fs';\nimport { fileURLToPath } from 'url';\nimport { dirname, join } from 'path';\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\nconst openAPISpec = JSON.parse(readFileSync(join(__dirname, 'openapi.json'), 'utf-8'));" : ""}
        ${validationCode.imports}

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
