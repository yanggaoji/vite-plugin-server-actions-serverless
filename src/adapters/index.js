/**
 * Serverless adapters for different platforms
 * 
 * The adapter pattern is extensible - you can create adapters for any platform:
 * - Azure Functions
 * - Google Cloud Functions
 * - Vercel Serverless Functions
 * - Netlify Functions
 * - Alibaba Cloud Function Compute
 * - Tencent Cloud SCF
 * - Any custom serverless platform
 * 
 * Simply extend BaseAdapter and implement:
 * - normalizeRequest(platformRequest)
 * - createResponse()
 * - handleRequest(platformRequest)
 * 
 * See docs/custom-adapters.md for detailed guide
 */

export { BaseAdapter, createJsonParser } from "./base.js";
export { ExpressAdapter } from "./express.js";
export { LambdaAdapter, createLambdaHandler } from "./lambda.js";
export { WorkersAdapter, createWorkersHandler } from "./workers.js";
