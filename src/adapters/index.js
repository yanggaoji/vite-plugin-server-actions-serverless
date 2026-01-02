/**
 * Serverless adapters for different platforms
 * Provides a unified interface for Express, AWS Lambda, and Cloudflare Workers
 */

export { BaseAdapter, createJsonParser } from "./base.js";
export { ExpressAdapter } from "./express.js";
export { LambdaAdapter, createLambdaHandler } from "./lambda.js";
export { WorkersAdapter, createWorkersHandler } from "./workers.js";
