import type { Plugin } from "vite";
import type { RequestHandler } from "express";
import type { z } from "zod";

export interface ValidationOptions {
	/**
	 * Enable validation for server actions
	 * @default false
	 */
	enabled?: boolean;
	
	/**
	 * Validation adapter to use
	 * @default "zod"
	 */
	adapter?: "zod";
	
	/**
	 * Generate OpenAPI documentation
	 * @default false
	 */
	generateOpenAPI?: boolean;
	
	/**
	 * Enable Swagger UI
	 * @default false
	 */
	swaggerUI?: boolean;
	
	/**
	 * OpenAPI generation options
	 */
	openAPIOptions?: {
		info?: {
			title?: string;
			version?: string;
			description?: string;
		};
		docsPath?: string;
		specPath?: string;
	};
}

export interface ServerActionOptions {
	/**
	 * Custom API prefix for server action endpoints
	 * @default "/api"
	 */
	apiPrefix?: string;
	
	/**
	 * Include patterns for server action files
	 * @default ["**\/*.server.js"]
	 */
	include?: string | string[];
	
	/**
	 * Exclude patterns for server action files
	 * @default []
	 */
	exclude?: string | string[];
	
	/**
	 * Middleware to run before server action handlers
	 * Can be a single middleware or array of middleware
	 */
	middleware?: RequestHandler | RequestHandler[];
	
	/**
	 * Transform function for module names (internal use)
	 * @param filePath - The file path relative to project root
	 * @returns The module name to use internally
	 */
	moduleNameTransform?: (filePath: string) => string;
	
	/**
	 * Transform function for API routes
	 * @param filePath - The file path relative to project root
	 * @param functionName - The exported function name
	 * @returns The API route path (without prefix)
	 * @default Clean hierarchical paths (removes src/ and .server.js)
	 */
	routeTransform?: (filePath: string, functionName: string) => string;
	
	/**
	 * Validation configuration
	 */
	validation?: ValidationOptions;
}

export interface ServerActionsPlugin extends Plugin {
	name: "vite-plugin-server-actions";
}

/**
 * Creates a Vite plugin that enables server actions
 * @param options - Configuration options for the plugin
 * @returns Vite plugin instance
 */
declare function serverActions(options?: ServerActionOptions): ServerActionsPlugin;

/**
 * Built-in middleware for server actions
 */
export declare const middleware: {
	/**
	 * Logging middleware that displays server action calls with formatted JSON output
	 */
	logging: RequestHandler;
};

/**
 * Path transformation utilities
 */
export declare const pathUtils: {
	/**
	 * Creates clean hierarchical routes: "actions/todo/create"
	 * @param filePath - The file path relative to project root
	 * @param functionName - The exported function name
	 * @returns Clean route path
	 */
	createCleanRoute: (filePath: string, functionName: string) => string;
	
	/**
	 * Creates legacy underscore-separated routes: "src_actions_todo/create"
	 * @param filePath - The file path relative to project root
	 * @param functionName - The exported function name
	 * @returns Legacy route path
	 */
	createLegacyRoute: (filePath: string, functionName: string) => string;
	
	/**
	 * Creates minimal routes: "actions/todo.server/create"
	 * @param filePath - The file path relative to project root
	 * @param functionName - The exported function name
	 * @returns Minimal route path
	 */
	createMinimalRoute: (filePath: string, functionName: string) => string;
	
	/**
	 * Creates module names for internal use
	 * @param filePath - The file path relative to project root
	 * @returns Module name
	 */
	createModuleName: (filePath: string) => string;
};

// Validation exports
export interface ValidationAdapter {
	validate(schema: any, data: any): Promise<any>;
	getSchemaType(schema: any): string;
}

export declare class ZodAdapter implements ValidationAdapter {
	validate(schema: z.ZodSchema<any>, data: any): Promise<any>;
	getSchemaType(schema: z.ZodSchema<any>): string;
}

export declare class SchemaDiscovery {
	constructor();
	addSchema(moduleName: string, functionName: string, schemaName: string, schema: any): void;
	getSchema(moduleName: string, functionName: string, schemaName: string): any;
	hasSchema(moduleName: string, functionName: string, schemaName: string): boolean;
	discoverFromModule(module: any, moduleName: string): void;
}

export declare const adapters: {
	zod: ZodAdapter;
};

export declare function createValidationMiddleware(options: {
	schemaDiscovery: SchemaDiscovery;
}): RequestHandler;

// OpenAPI exports
export declare class OpenAPIGenerator {
	constructor(options?: { info?: any });
	generateSpec(serverFunctions: Map<string, any>, schemaDiscovery: SchemaDiscovery, options?: any): any;
}

export declare function setupOpenAPIEndpoints(app: any, options: any): void;

export declare function createSwaggerMiddleware(spec: any): RequestHandler;

export default serverActions;