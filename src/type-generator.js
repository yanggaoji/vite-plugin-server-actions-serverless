/**
 * TypeScript definition generator for server actions
 * Generates accurate .d.ts files with full type information
 */

/**
 * Generate TypeScript definitions for server actions
 * @param {Map} serverFunctions - Map of module names to function info
 * @param {Object} options - Plugin options
 * @returns {string} - TypeScript definition content
 */
export function generateTypeDefinitions(serverFunctions, options = {}) {
	let typeDefinitions = `// Auto-generated TypeScript definitions for Vite Server Actions
// This file is automatically updated when server actions change

`;

	// Add imports for common types
	typeDefinitions += `type ServerActionResult<T> = Promise<T>;
type ServerActionError = {
  error: boolean;
  status: number;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
};

`;

	// Generate types for each module
	for (const [moduleName, moduleInfo] of serverFunctions) {
		typeDefinitions += generateModuleTypes(moduleName, moduleInfo);
	}

	// Generate a global interface that combines all server actions
	typeDefinitions += generateGlobalInterface(serverFunctions);

	return typeDefinitions;
}

/**
 * Generate TypeScript types for a specific module
 * @param {string} moduleName - Module name
 * @param {Object} moduleInfo - Module information with functions
 * @returns {string}
 */
function generateModuleTypes(moduleName, moduleInfo) {
	const { functions, filePath, functionDetails = [] } = moduleInfo;

	let moduleTypes = `// Types for ${filePath}\n`;
	moduleTypes += `declare module "${filePath}" {\n`;

	functionDetails.forEach((func) => {
		const signature = generateFunctionSignature(func);
		const jsdocComment = func.jsdoc ? formatJSDocForTS(func.jsdoc) : "";

		moduleTypes += `${jsdocComment}  export ${signature};\n`;
	});

	moduleTypes += `}\n\n`;

	return moduleTypes;
}

/**
 * Generate function signature with proper TypeScript syntax
 * @param {Object} func - Function information
 * @returns {string}
 */
function generateFunctionSignature(func) {
	const { name, isAsync, params, returnType } = func;

	// Generate parameter list
	const paramList = params
		.map((param) => {
			let paramStr = param.name;

			// Add type annotation
			if (param.type) {
				paramStr += `: ${param.type}`;
			} else {
				paramStr += `: any`; // Fallback for untyped parameters
			}

			// Handle optional parameters
			if (param.isOptional && !param.name.includes("...")) {
				// Insert ? before the type annotation
				paramStr = paramStr.replace(":", "?:");
			}

			return paramStr;
		})
		.join(", ");

	// Determine return type
	let resultType = returnType || "any";
	if (isAsync) {
		// Check if the return type is already a Promise
		if (resultType.startsWith("Promise<")) {
			// Already wrapped in Promise, don't double-wrap
			resultType = resultType;
		} else {
			resultType = `Promise<${resultType}>`;
		}
	}

	return `function ${name}(${paramList}): ${resultType}`;
}

/**
 * Generate JavaScript function signature (without TypeScript types)
 * @param {Object} func - Function information
 * @returns {string}
 */
function generateJavaScriptSignature(func) {
	const { name, params } = func;

	// Generate parameter list without TypeScript types
	const paramList = params
		.map((param) => {
			let paramStr = param.name;

			// For JavaScript, we only need the parameter name
			// Optional and rest parameters are handled naturally

			return paramStr;
		})
		.join(", ");

	return `function ${name}(${paramList})`;
}

/**
 * Generate a global interface that combines all server actions
 * @param {Map} serverFunctions - All server functions
 * @returns {string}
 */
function generateGlobalInterface(serverFunctions) {
	let globalInterface = `// Global server actions interface
declare global {
  namespace ServerActions {
`;

	for (const [moduleName, moduleInfo] of serverFunctions) {
		const { functionDetails = [] } = moduleInfo;

		globalInterface += `    namespace ${capitalizeFirst(moduleName)} {\n`;

		functionDetails.forEach((func) => {
			const signature = generateFunctionSignature(func);
			const jsdocComment = func.jsdoc ? formatJSDocForTS(func.jsdoc, "      ") : "";

			globalInterface += `${jsdocComment}      ${signature};\n`;
		});

		globalInterface += `    }\n`;
	}

	globalInterface += `  }
}

export {};
`;

	return globalInterface;
}

/**
 * Format JSDoc comments for TypeScript
 * @param {string} jsdoc - Raw JSDoc comment
 * @param {string} indent - Indentation prefix
 * @returns {string}
 */
function formatJSDocForTS(jsdoc, indent = "  ") {
	if (!jsdoc) return "";

	// Clean up the JSDoc comment and add proper indentation
	const lines = jsdoc.split("\n");
	const formattedLines = lines.map((line) => `${indent}${line.trim()}`);

	return formattedLines.join("\n") + "\n";
}

/**
 * Capitalize first letter of a string
 * @param {string} str - Input string
 * @returns {string}
 */
function capitalizeFirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate enhanced client proxy with better TypeScript support
 * @param {string} moduleName - Module name
 * @param {Array} functionDetails - Detailed function information
 * @param {Object} options - Plugin options
 * @param {string} filePath - Relative file path
 * @returns {string}
 */
export function generateEnhancedClientProxy(moduleName, functionDetails, options, filePath) {
	const isDev = process.env.NODE_ENV !== "production";

	let clientProxy = `\n// vite-server-actions: ${moduleName}\n`;

	// Add TypeScript types if we have detailed information
	if (functionDetails.length > 0) {
		clientProxy += `// Auto-generated types for ${filePath}\n`;

		functionDetails.forEach((func) => {
			if (func.jsdoc) {
				clientProxy += `${func.jsdoc}\n`;
			}
		});
	}

	// Add development safety checks
	if (isDev) {
		clientProxy += `
// Development-only safety check
if (typeof window !== 'undefined') {
  const serverFileError = new Error(
    '[Vite Server Actions] SECURITY WARNING: Server file "${moduleName}" is being imported in client code! ' +
    'This could expose server-side code to the browser. Only import server actions through the plugin.'
  );
  serverFileError.name = 'ServerCodeInClientError';
  
  if (!window.__VITE_SERVER_ACTIONS_PROXY__) {
    console.error(serverFileError);
    console.error('Stack trace:', serverFileError.stack);
  }
}
`;
	}

	// Generate functions with enhanced type information
	functionDetails.forEach((func) => {
		const routePath = options.routeTransform(filePath, func.name);
		// Generate JavaScript signature (without TypeScript types)
		const jsSignature = generateJavaScriptSignature(func);

		// Generate JSDoc with parameter types if not already present
		let jsdocComment = func.jsdoc;
		if (!jsdocComment || !jsdocComment.includes("@param")) {
			// Generate JSDoc from function information
			jsdocComment = `/**\n * ${func.jsdoc ? func.jsdoc.replace(/\/\*\*|\*\//g, "").trim() : `Server action: ${func.name}`}`;

			// Add parameter documentation
			func.params.forEach((param) => {
				const paramType = param.type || "any";
				const optionalMark = param.isOptional ? " [" + param.name.replace("?", "") + "]" : " " + param.name;
				jsdocComment += `\n * @param {${paramType}}${optionalMark}`;
			});

			// Add return type documentation
			if (func.returnType) {
				jsdocComment += `\n * @returns {${func.returnType}}`;
			}

			jsdocComment += "\n */";
		}

		clientProxy += `
${jsdocComment}
export async ${jsSignature} {
  console.log("[Vite Server Actions] 🚀 - Executing ${func.name}");
  
  ${
		isDev
			? `
  // Development-only: Mark that we're in a valid proxy context
  if (typeof window !== 'undefined') {
    window.__VITE_SERVER_ACTIONS_PROXY__ = true;
  }
  
  // Validate arguments in development
  if (arguments.length > 0) {
    const args = Array.from(arguments);
    
    // Check for functions
    if (args.some(arg => typeof arg === 'function')) {
      console.warn(
        '[Vite Server Actions] Warning: Functions cannot be serialized and sent to the server. ' +
        'Function arguments will be converted to null.'
      );
    }
    
    // Check argument count
    const requiredParams = ${JSON.stringify(func.params.filter((p) => !p.isOptional && !p.isRest))};
    const maxParams = ${func.params.filter((p) => !p.isRest).length};
    const hasRest = ${func.params.some((p) => p.isRest)};
    
    if (args.length < requiredParams.length) {
      console.warn(\`[Vite Server Actions] Warning: Function '${func.name}' expects at least \${requiredParams.length} arguments, got \${args.length}\`);
    }
    
    if (args.length > maxParams && !hasRest) {
      console.warn(\`[Vite Server Actions] Warning: Function '${func.name}' expects at most \${maxParams} arguments, got \${args.length}\`);
    }
    
    // Check for non-serializable types
    args.forEach((arg, index) => {
      if (arg instanceof Date) {
        console.warn(\`[Vite Server Actions] Warning: Argument \${index + 1} is a Date object. Consider passing as ISO string: \${arg.toISOString()}\`);
      } else if (arg instanceof RegExp) {
        console.warn(\`[Vite Server Actions] Warning: Argument \${index + 1} is a RegExp and cannot be serialized properly\`);
      } else if (arg && typeof arg === 'object' && arg.constructor !== Object && !Array.isArray(arg)) {
        console.warn(\`[Vite Server Actions] Warning: Argument \${index + 1} is a custom object instance that may not serialize properly\`);
      }
    });
  }
  `
			: ""
	}
  
  try {
    const response = await fetch('${options.apiPrefix}/${routePath}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Array.from(arguments))
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { 
          error: true,
          status: response.status,
          message: 'Failed to parse error response',
          timestamp: new Date().toISOString()
        };
      }
      
      console.error("[Vite Server Actions] ❗ - Error in ${func.name}:", errorData);
      
      const error = new Error(errorData.message || 'Server request failed');
      Object.assign(error, errorData);
      throw error;
    }

    console.log("[Vite Server Actions] ✅ - ${func.name} executed successfully");
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
    console.error("[Vite Server Actions] ❗ - Network or execution error in ${func.name}:", error.message);
    
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
    if (!error.status) {
      const networkError = new Error(\`Failed to execute server action '\${func.name}': \${error.message}\`);
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
