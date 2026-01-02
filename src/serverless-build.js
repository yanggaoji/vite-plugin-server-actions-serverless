/**
 * Serverless build utilities
 * Generates platform-specific handler files for serverless deployment
 */

import { generateValidationCode } from "./build-utils.js";

/**
 * Generate AWS Lambda handler
 * @param {Map} serverFunctions - Map of server functions
 * @param {Object} options - Plugin options
 * @param {Object} validationCode - Generated validation code
 * @returns {string} Lambda handler code
 */
export function generateLambdaHandler(serverFunctions, options, validationCode) {
	return `
import { LambdaAdapter } from './adapters/lambda.js';
import * as serverActions from './actions.js';
${options.openAPI?.enabled ? "import { readFileSync } from 'fs';\nimport { fileURLToPath } from 'url';\nimport { dirname, join } from 'path';\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\nconst openAPISpec = JSON.parse(readFileSync(join(__dirname, 'openapi.json'), 'utf-8'));" : ""}
${validationCode.imports}
${validationCode.validationRuntime}

// Create Lambda adapter
const adapter = new LambdaAdapter();
${validationCode.setup}
${validationCode.middlewareFactory}

// JSON parser middleware
adapter.use((req, res, next) => {
	if (req.body === undefined && req.headers['content-type']?.includes('application/json')) {
		try {
			if (typeof req.body === 'string') {
				req.body = JSON.parse(req.body);
			}
		} catch (error) {
			res.status(400).json({
				error: true,
				status: 400,
				message: 'Invalid JSON in request body',
				code: 'INVALID_JSON',
			});
			return;
		}
	}
	next();
});

// Register server action routes
${Array.from(serverFunctions.entries())
	.flatMap(([moduleName, { functions, filePath }]) =>
		functions
			.map((functionName) => {
				const routePath = options.routeTransform(filePath, functionName);
				const middlewareCall = options.validation?.enabled
					? `createContextualValidationMiddleware('${moduleName}', '${functionName}'), `
					: "";
				return `
adapter.post('${options.apiPrefix}/${routePath}', ${middlewareCall}async (req, res) => {
	try {
		const result = await serverActions.${moduleName}.${functionName}(...req.body);
		if (result === undefined) {
			res.status(204).end();
		} else {
			res.json(result);
		}
	} catch (error) {
		console.error(\`Error in ${functionName}: \${error.message}\`);
		const status = error.status || 500;
		res.status(status).json({
			error: true,
			status,
			message: status === 500 ? 'Internal server error' : error.message,
			code: error.code || 'SERVER_ACTION_ERROR',
			timestamp: new Date().toISOString(),
			...(process.env.NODE_ENV !== 'production' ? { details: { message: error.message, stack: error.stack } } : {})
		});
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
	options.openAPI?.enabled
		? `
// OpenAPI endpoints
adapter.get('${options.openAPI.specPath}', (req, res) => {
	res.json(openAPISpec);
});
`
		: ""
}

// Export Lambda handler
export const handler = adapter.createHandler();
`;
}

/**
 * Generate Cloudflare Workers handler
 * @param {Map} serverFunctions - Map of server functions
 * @param {Object} options - Plugin options
 * @param {Object} validationCode - Generated validation code
 * @returns {string} Workers handler code
 */
export function generateWorkersHandler(serverFunctions, options, validationCode) {
	return `
import { WorkersAdapter } from './adapters/workers.js';
import * as serverActions from './actions.js';
${options.openAPI?.enabled ? "import openAPISpec from './openapi.json';" : ""}
${validationCode.imports}
${validationCode.validationRuntime}

// Create Workers adapter
const adapter = new WorkersAdapter();
${validationCode.setup}
${validationCode.middlewareFactory}

// JSON parser middleware
adapter.use((req, res, next) => {
	if (req.body === undefined && req.headers['content-type']?.includes('application/json')) {
		try {
			if (typeof req.body === 'string') {
				req.body = JSON.parse(req.body);
			}
		} catch (error) {
			res.status(400).json({
				error: true,
				status: 400,
				message: 'Invalid JSON in request body',
				code: 'INVALID_JSON',
			});
			return;
		}
	}
	next();
});

// Register server action routes
${Array.from(serverFunctions.entries())
	.flatMap(([moduleName, { functions, filePath }]) =>
		functions
			.map((functionName) => {
				const routePath = options.routeTransform(filePath, functionName);
				const middlewareCall = options.validation?.enabled
					? `createContextualValidationMiddleware('${moduleName}', '${functionName}'), `
					: "";
				return `
adapter.post('${options.apiPrefix}/${routePath}', ${middlewareCall}async (req, res) => {
	try {
		const result = await serverActions.${moduleName}.${functionName}(...req.body);
		if (result === undefined) {
			res.status(204).end();
		} else {
			res.json(result);
		}
	} catch (error) {
		console.error(\`Error in ${functionName}: \${error.message}\`);
		const status = error.status || 500;
		res.status(status).json({
			error: true,
			status,
			message: status === 500 ? 'Internal server error' : error.message,
			code: error.code || 'SERVER_ACTION_ERROR',
			timestamp: new Date().toISOString(),
			...(process.env.NODE_ENV !== 'production' ? { details: { message: error.message, stack: error.stack } } : {})
		});
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
	options.openAPI?.enabled
		? `
// OpenAPI endpoints
adapter.get('${options.openAPI.specPath}', (req, res) => {
	res.json(openAPISpec);
});
`
		: ""
}

// Export Workers handler
export default adapter.createHandler();
`;
}

/**
 * Generate Express server (traditional deployment)
 * @param {Map} serverFunctions - Map of server functions
 * @param {Object} options - Plugin options
 * @param {Object} validationCode - Generated validation code
 * @returns {string} Express server code
 */
export function generateExpressServer(serverFunctions, options, validationCode) {
	return `
import express from 'express';
import * as serverActions from './actions.js';
${options.openAPI?.enabled && options.openAPI.swaggerUI ? "import swaggerUi from 'swagger-ui-express';" : ""}
${options.openAPI?.enabled ? "import { readFileSync } from 'fs';\nimport { fileURLToPath } from 'url';\nimport { dirname, join } from 'path';\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\nconst openAPISpec = JSON.parse(readFileSync(join(__dirname, 'openapi.json'), 'utf-8'));" : ""}
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
		if (result === undefined) {
			res.status(204).end();
		} else {
			res.json(result);
		}
	} catch (error) {
		console.error(\`Error in ${functionName}: \${error.message}\`);
		const status = error.status || 500;
		res.status(status).json({
			error: true,
			status,
			message: status === 500 ? 'Internal server error' : error.message,
			code: error.code || 'SERVER_ACTION_ERROR',
			timestamp: new Date().toISOString(),
			...(process.env.NODE_ENV !== 'production' ? { details: { message: error.message, stack: error.stack } } : {})
		});
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
	options.openAPI?.enabled
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
		options.openAPI?.enabled
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
}
