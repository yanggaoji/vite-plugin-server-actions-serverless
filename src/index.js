import fs from "fs/promises";
import path from "path";
import express from "express";
// TODO: find a way to not use rollup directly
import { rollup } from "rollup";
import { minimatch } from "minimatch";
import { middleware } from "./middleware.js";

const DEFAULT_OPTIONS = {
	apiPrefix: "/api",
	include: ["**/*.server.js"],
	exclude: [],
	middleware: [],
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
	const options = { ...DEFAULT_OPTIONS, ...userOptions };
	const serverFunctions = new Map();
	let app;

	return {
		name: "vite-plugin-server-actions",

		configureServer(server) {
			app = express();
			app.use(express.json());
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

					// Create a unique module name based on the file path
					// Convert path separators to underscores and remove .server.js extension
					let relativePath = path.relative(process.cwd(), id);

					// If the file is outside the project root, use the absolute path
					if (relativePath.startsWith("..")) {
						relativePath = id;
					}

					const moduleName = relativePath
						.replace(/\\/g, "/") // Normalize path separators
						.replace(/^\//, "") // Remove leading slash
						.replace(/\//g, "_") // Replace slashes with underscores
						.replace(/\./g, "_") // Replace dots with underscores
						.replace(/_server_js$/, ""); // Remove .server.js extension

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

					serverFunctions.set(moduleName, { functions: uniqueFunctions, id });

					if (process.env.NODE_ENV !== "production") {
						// Normalize middleware to array
						const middlewares = Array.isArray(options.middleware)
							? options.middleware
							: options.middleware
								? [options.middleware]
								: [];

						uniqueFunctions.forEach((functionName) => {
							const endpoint = `${options.apiPrefix}/${moduleName}/${functionName}`;

							// Apply middleware before the handler
							app.post(endpoint, ...middlewares, async (req, res) => {
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
					return generateClientProxy(moduleName, uniqueFunctions, options);
				} catch (error) {
					console.error(`Failed to process server file ${id}: ${error.message}`);
					// Return empty proxy instead of failing the build
					return `// Failed to load server actions from ${id}: ${error.message}`;
				}
			}
		},

		async generateBundle(options, bundle) {
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

			// Get the bundled code
			const bundledCode = output[0].code;

			// Emit the bundled server functions
			this.emitFile({
				type: "asset",
				fileName: "actions.js",
				source: bundledCode,
			});

			// Generate server.js
			const serverCode = `
        import express from 'express';
        import * as serverActions from './actions.js';

        const app = express();

        // Middleware
        // --------------------------------------------------
        app.use(express.json());
        app.use(express.static('dist'));

				// Server functions
				// --------------------------------------------------
        ${Array.from(serverFunctions.entries())
					.flatMap(([moduleName, { functions }]) =>
						functions
							.map(
								(functionName) => `
            app.post('${options.apiPrefix}/${moduleName}/${functionName}', async (req, res) => {
              try {
                const result = await serverActions.${moduleName}.${functionName}(...req.body);
                res.json(result || "* No response *");
              } catch (error) {
                console.error(\`Error in ${functionName}: \${error.message}\`);
                res.status(500).json({ error: error.message });
              }
            });
          `,
							)
							.join("\n")
							.trim(),
					)
					.join("\n")
					.trim()}

				// Start server
				// --------------------------------------------------
        const port = process.env.PORT || 3000;
        app.listen(port, () => console.log(\`🚀 Server listening: http://localhost:\${port}\`));

        // List all server functions
				// --------------------------------------------------
      `;

			// TODO: Add a way to list all server functions in the console

			this.emitFile({
				type: "asset",
				fileName: "server.js",
				source: serverCode,
			});
		},
	};
}

function generateClientProxy(moduleName, functions, options) {
	let clientProxy = `\n// vite-server-actions: ${moduleName}\n`;
	functions.forEach((functionName) => {
		clientProxy += `
      export async function ${functionName}(...args) {
      	console.log("[Vite Server Actions] 🚀 - Executing ${functionName}");
        
        try {
          const response = await fetch('${options.apiPrefix}/${moduleName}/${functionName}', {
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
          return await response.json();
          
        } catch (error) {
          console.error("[Vite Server Actions] ❗ - Network or execution error in ${functionName}:", error.message);
          
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

// Export built-in middleware
export { middleware };
