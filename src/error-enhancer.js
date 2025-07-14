/**
 * Enhanced error handling with context and suggestions
 * Provides developer-friendly error messages with actionable suggestions
 */

/**
 * Create an enhanced error message with context and suggestions
 * @param {string} errorType - Type of error
 * @param {string} originalMessage - Original error message
 * @param {Object} context - Error context information
 * @returns {string}
 */
export function createEnhancedError(errorType, originalMessage, context = {}) {
	const { filePath, functionName, availableFunctions, suggestion } = context;

	let enhancedMessage = `[Vite Server Actions] ${errorType}: ${originalMessage}`;

	if (filePath) {
		enhancedMessage += `\n  📁 File: ${filePath}`;
	}

	if (functionName) {
		enhancedMessage += `\n  🔧 Function: ${functionName}`;
	}

	if (availableFunctions && availableFunctions.length > 0) {
		enhancedMessage += `\n  📋 Available functions: ${availableFunctions.join(", ")}`;
	}

	if (suggestion) {
		enhancedMessage += `\n  💡 Suggestion: ${suggestion}`;
	}

	return enhancedMessage;
}

/**
 * Enhance function not found errors
 * @param {string} functionName - The function that wasn't found
 * @param {string} moduleName - Module where function was expected
 * @param {Array} availableFunctions - List of available functions
 * @returns {Object}
 */
export function enhanceFunctionNotFoundError(functionName, moduleName, availableFunctions = []) {
	const suggestions = [];

	// Check for similar function names (typos)
	const similarFunctions = availableFunctions.filter((fn) => levenshteinDistance(fn, functionName) <= 2);

	if (similarFunctions.length > 0) {
		suggestions.push(`Did you mean: ${similarFunctions.join(", ")}?`);
	}

	// Check for common naming patterns
	const namingPatterns = [
		{ pattern: /^get/, suggestion: "For data fetching, consider: fetch, load, or retrieve" },
		{ pattern: /^create/, suggestion: "For creation, consider: add, insert, or save" },
		{ pattern: /^update/, suggestion: "For updates, consider: edit, modify, or change" },
		{ pattern: /^delete/, suggestion: "For deletion, consider: remove, destroy, or clear" },
	];

	const matchingPattern = namingPatterns.find((p) => p.pattern.test(functionName));
	if (matchingPattern) {
		suggestions.push(matchingPattern.suggestion);
	}

	if (availableFunctions.length === 0) {
		suggestions.push("No functions are exported from this module. Make sure to export your functions.");
	}

	return {
		message: createEnhancedError(
			"Function Not Found",
			`Function '${functionName}' not found in module '${moduleName}'`,
			{
				functionName,
				availableFunctions,
				suggestion: suggestions.join(" "),
			},
		),
		code: "FUNCTION_NOT_FOUND",
		suggestions,
	};
}

/**
 * Enhance AST parsing errors
 * @param {string} filePath - File that failed to parse
 * @param {Error} originalError - Original parsing error
 * @returns {Object}
 */
export function enhanceParsingError(filePath, originalError) {
	const suggestions = [];

	if (originalError.message.includes("Unexpected token")) {
		suggestions.push("Check for syntax errors in your server action file");
		suggestions.push("Ensure all functions are properly exported");
	}

	if (originalError.message.includes("Identifier")) {
		suggestions.push("Function names must be valid JavaScript identifiers");
		suggestions.push("Function names cannot start with numbers or contain special characters");
	}

	if (originalError.message.includes("duplicate")) {
		suggestions.push("Each function name must be unique within the same file");
		suggestions.push("Consider renaming duplicate functions or using different export patterns");
	}

	return {
		message: createEnhancedError("Parsing Error", `Failed to parse server action file: ${originalError.message}`, {
			filePath,
			suggestion: suggestions.join(" "),
		}),
		code: "PARSE_ERROR",
		suggestions,
	};
}

/**
 * Enhance validation errors
 * @param {Array} validationErrors - Array of validation errors
 * @param {string} functionName - Function that failed validation
 * @returns {Object}
 */
export function enhanceValidationError(validationErrors, functionName) {
	const suggestions = [];

	// Analyze common validation patterns
	const hasTypeErrors = validationErrors.some(
		(err) => err.message.includes("Expected") || err.message.includes("Invalid"),
	);

	if (hasTypeErrors) {
		suggestions.push("Check the types of arguments you're passing to the function");
	}

	const hasRequiredErrors = validationErrors.some(
		(err) => err.message.includes("required") || err.message.includes("missing"),
	);

	if (hasRequiredErrors) {
		suggestions.push("Make sure all required parameters are provided");
	}

	const hasFormatErrors = validationErrors.some(
		(err) => err.message.includes("format") || err.message.includes("pattern"),
	);

	if (hasFormatErrors) {
		suggestions.push("Check the format of string inputs (email, URL, etc.)");
	}

	return {
		message: createEnhancedError("Validation Error", `Validation failed for function '${functionName}'`, {
			functionName,
			suggestion: suggestions.join(" "),
		}),
		code: "VALIDATION_ERROR",
		suggestions,
	};
}

/**
 * Enhance module loading errors
 * @param {string} modulePath - Path to module that failed to load
 * @param {Error} originalError - Original loading error
 * @returns {Object}
 */
export function enhanceModuleLoadError(modulePath, originalError) {
	const suggestions = [];

	if (originalError.code === "ENOENT") {
		suggestions.push("Make sure the file exists and the path is correct");
		suggestions.push("Check that your build process hasn't moved or renamed the file");
	}

	if (originalError.message.includes("import")) {
		suggestions.push("Verify all import statements in your server action file");
		suggestions.push("Make sure imported modules are installed and available");
	}

	if (originalError.message.includes("export")) {
		suggestions.push("Ensure your functions are properly exported");
		suggestions.push("Use 'export function' or 'export const' for your server actions");
	}

	return {
		message: createEnhancedError("Module Load Error", `Failed to load server action module: ${originalError.message}`, {
			filePath: modulePath,
			suggestion: suggestions.join(" "),
		}),
		code: "MODULE_LOAD_ERROR",
		suggestions,
	};
}

/**
 * Enhance development warnings with helpful context
 * @param {string} warningType - Type of warning
 * @param {string} message - Warning message
 * @param {Object} context - Additional context
 * @returns {string}
 */
export function createDevelopmentWarning(warningType, message, context = {}) {
	let warning = `[Vite Server Actions] ⚠️ ${warningType}: ${message}`;

	if (context.filePath) {
		warning += `\n  📁 File: ${context.filePath}`;
	}

	if (context.suggestion) {
		warning += `\n  💡 Tip: ${context.suggestion}`;
	}

	return warning;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number}
 */
function levenshteinDistance(a, b) {
	const matrix = [];

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
			}
		}
	}

	return matrix[b.length][a.length];
}

/**
 * Generate helpful suggestions based on common mistakes
 * @param {string} errorContext - Context where error occurred
 * @param {Object} additionalInfo - Additional information about the error
 * @returns {Array<string>}
 */
export function generateHelpfulSuggestions(errorContext, additionalInfo = {}) {
	const suggestions = [];

	switch (errorContext) {
		case "no-functions-found":
			suggestions.push("Make sure your functions are exported: export async function myFunction() {}");
			suggestions.push("Check that your file ends with .server.js or .server.ts");
			suggestions.push("Verify the file is in a location matched by your include patterns");
			break;

		case "async-function-required":
			suggestions.push("Server actions should be async functions");
			suggestions.push("Change 'export function' to 'export async function'");
			break;

		case "invalid-arguments":
			suggestions.push("All function arguments must be JSON-serializable");
			suggestions.push("Functions, classes, and other complex objects cannot be passed");
			suggestions.push("Consider passing plain objects, arrays, strings, and numbers only");
			break;

		case "type-safety":
			suggestions.push("Add TypeScript types to your server actions for better development experience");
			suggestions.push("Use Zod schemas for runtime validation");
			break;
	}

	return suggestions;
}
