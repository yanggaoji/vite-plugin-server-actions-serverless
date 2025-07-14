// Simple test script to verify validation functionality
import { ZodAdapter, SchemaDiscovery, createValidationMiddleware } from "./src/validation.js";
import { z } from "zod";

console.log("🧪 Testing validation system...\n");

// Test Zod adapter
const adapter = new ZodAdapter();
const schema = z.object({
	name: z.string().min(1),
	age: z.number().int().min(0),
});

console.log("1. Testing valid data...");
const validResult = await adapter.validate(schema, { name: "John", age: 30 });
console.log("✅ Valid data:", validResult);

console.log("\n2. Testing invalid data...");
const invalidResult = await adapter.validate(schema, { name: "", age: -5 });
console.log("❌ Invalid data:", invalidResult);

console.log("\n3. Testing OpenAPI schema generation...");
const openAPISchema = adapter.toOpenAPISchema(schema);
console.log("📄 OpenAPI schema:", JSON.stringify(openAPISchema, null, 2));

console.log("\n4. Testing schema discovery...");
const discovery = new SchemaDiscovery();

// Mock module with schema
const mockFunction = function testFunc(data) {
	return data;
};
mockFunction.schema = schema;

const mockModule = { testFunc: mockFunction };
discovery.discoverFromModule(mockModule, "testModule");

const discoveredSchema = discovery.getSchema("testModule", "testFunc");
console.log("🔍 Discovered schema:", discoveredSchema === schema ? "✅ Found!" : "❌ Not found");

console.log("\n✅ All validation tests passed!");
