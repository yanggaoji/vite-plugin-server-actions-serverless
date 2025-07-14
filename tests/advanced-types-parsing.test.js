import { describe, it, expect } from "vitest";
import { extractExportedFunctions } from "../src/ast-parser.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Advanced TypeScript Types Parsing", () => {
	it("should parse the advanced-types.server.ts file correctly", async () => {
		// Read the actual advanced types file
		const filePath = path.join(
			__dirname,
			"..",
			"examples",
			"react-todo-app-typescript",
			"src",
			"actions",
			"advanced-types.server.ts",
		);

		const code = await fs.readFile(filePath, "utf-8");
		const functions = extractExportedFunctions(code, "advanced-types.server.ts");

		// Check that we found all the exported functions
		const functionNames = functions.map((f) => f.name);
		expect(functionNames).toContain("isString");
		expect(functionNames).toContain("isUser");
		expect(functionNames).toContain("processData");
		expect(functionNames).toContain("getStatus");
		expect(functionNames).toContain("processBigNumbers");
		expect(functionNames).toContain("throwError");
		expect(functionNames).toContain("processUnknown");
		expect(functionNames).toContain("complexFunction");
		expect(functionNames).toContain("fetchUserList");
		expect(functionNames).toContain("processRecords");
		expect(functionNames).toContain("processDeepNested");
		expect(functionNames).toContain("createUser");

		// Check specific type patterns
		const isString = functions.find((f) => f.name === "isString");
		expect(isString.returnType).toBe("value is string");
		expect(isString.params[0].type).toBe("unknown");

		const isUser = functions.find((f) => f.name === "isUser");
		expect(isUser.returnType).toBe("obj is User");

		const processData = functions.find((f) => f.name === "processData");
		expect(processData.params[0].type).toBe("T");
		expect(processData.params[1].type).toContain("T & { processed: true }");
		expect(processData.returnType).toBe("Promise<T & { processed: true }>");

		const getStatus = functions.find((f) => f.name === "getStatus");
		expect(getStatus.returnType).toBe("Promise<Status>");

		const processBigNumbers = functions.find((f) => f.name === "processBigNumbers");
		expect(processBigNumbers.params[0].type).toBe("bigint");
		expect(processBigNumbers.params[1].type).toBe("symbol");

		const throwError = functions.find((f) => f.name === "throwError");
		expect(throwError.returnType).toBe("never");

		const processUnknown = functions.find((f) => f.name === "processUnknown");
		expect(processUnknown.params[0].type).toBe("unknown");

		const complexFunction = functions.find((f) => f.name === "complexFunction");
		expect(complexFunction.params[0].type).toBe("() => void");
		expect(complexFunction.params[1].type).toBe("(a: string, b: number) => boolean");
		expect(complexFunction.params[2].type).toBe("(a?: string) => void");
		expect(complexFunction.params[3].type).toBe("(...args: any[]) => void");

		const fetchUserList = functions.find((f) => f.name === "fetchUserList");
		expect(fetchUserList.params[0].type).toBe("number[]");
		expect(fetchUserList.returnType).toBe("Promise<Array<User | null>>");

		const processRecords = functions.find((f) => f.name === "processRecords");
		expect(processRecords.params[0].type).toBe("Record<string, User>");
		expect(processRecords.params[1].type).toBe("Map<string, User>");

		const processDeepNested = functions.find((f) => f.name === "processDeepNested");
		expect(processDeepNested.params[0].type).toBe("Map<string, Array<Promise<User | null>>>");

		const createUser = functions.find((f) => f.name === "createUser");
		expect(createUser.params[0].type).toBe("CreateUserInput");
		expect(createUser.returnType).toBe("Promise<UserWithTimestamps>");
	});

	it("should handle all type patterns without crashing", async () => {
		// This test ensures our generateCode function can handle all the complex types
		// without throwing errors
		const complexCode = `
			export function testAllPatterns(
				intersection: A & B & C,
				tuple: [string, number, boolean],
				templateLiteral: \`prefix-\${string}-suffix\`,
				conditional: T extends U ? X : Y,
				readonlyArray: readonly string[],
				keyofType: keyof User,
				typeofValue: typeof someValue,
				indexed: User["name"]["length"],
				mapped: { [K in keyof T]: T[K] },
				predicate: unknown
			): value is string {}
		`;

		const functions = extractExportedFunctions(complexCode, "test.ts");
		expect(functions).toHaveLength(1);

		const func = functions[0];
		expect(func.params[0].type).toBe("A & B & C");
		expect(func.params[1].type).toBe("[string, number, boolean]");
		expect(func.params[2].type).toBe("`prefix-${string}-suffix`");
		expect(func.params[3].type).toBe("T extends U ? X : Y");
		expect(func.params[4].type).toBe("readonly string[]");
		expect(func.params[5].type).toBe("keyof User");
		expect(func.params[6].type).toBe("typeof someValue");
		expect(func.params[7].type).toBe('User["name"]["length"]');
		expect(func.params[8].type).toContain("[K in keyof T]");
		expect(func.returnType).toBe("value is string");
	});
});
