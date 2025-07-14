import { z } from "zod";

// Advanced TypeScript type examples to showcase generateCode capabilities

// 1. Intersection Types
export interface User {
  id: number;
  name: string;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

// Intersection type
export type UserWithTimestamps = User & Timestamps;

// 2. Tuple Types
export type StatusTuple = [string, number, boolean];
export type NestedTuple = [string, [number, boolean]];

// 3. Template Literal Types
export type EventName = `on${Capitalize<string>}`;
export type RoutePattern = `/api/${string}/${string}`;

// 4. Conditional Types
export type IsArray<T> = T extends any[] ? true : false;
export type ExtractArrayType<T> = T extends (infer U)[] ? U : never;

// 5. Mapped Types
export type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

export type Optional<T> = {
  [K in keyof T]?: T[K];
};

// 6. Index Signatures
export interface StringRecord {
  [key: string]: any;
}

export interface MixedObject {
  name: string;
  [key: string]: string | number;
}

// 7. Type Predicates
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isUser(obj: any): obj is User {
  return obj && typeof obj.id === "number" && typeof obj.name === "string";
}

// 8. Import Types (simulated)
export type ImportedUser = import("./todo.server").Todo;

// 9. Complex Generic Functions
export async function processData<T extends object>(
  data: T,
  transform: (item: T) => T & { processed: true }
): Promise<T & { processed: true }> {
  return transform(data);
}

// Schema for validation
processData.schema = z.tuple([
  z.object({}),
  z.function().args(z.any()).returns(z.any())
]);

// 10. Union Types with Literals
export type Status = "active" | "inactive" | "pending";
export type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function getStatus(): Promise<Status> {
  return "active";
}

getStatus.schema = z.tuple([]);

// 11. BigInt and Symbol types
export async function processBigNumbers(
  bigValue: bigint,
  symbolKey: symbol
): Promise<{ big: bigint; sym: symbol }> {
  return { big: bigValue, sym: symbolKey };
}

// Note: Zod doesn't directly support bigint/symbol, using custom validation
processBigNumbers.schema = z.tuple([
  z.any().refine((val) => typeof val === "bigint", "Expected bigint"),
  z.any().refine((val) => typeof val === "symbol", "Expected symbol")
]);

// 12. Never and Unknown types
export function throwError(message: string): never {
  throw new Error(message);
}

export function processUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  return String(value);
}

processUnknown.schema = z.tuple([z.unknown()]);

// 13. This type (in class context)
export class TodoManager {
  private todos: any[] = [];
  
  addTodo(todo: any): this {
    this.todos.push(todo);
    return this;
  }
  
  getTodos(): any[] {
    return this.todos;
  }
}

// 14. Type Operators
export type ReadonlyUser = Readonly<User>;
export type UserKeys = keyof User;
export type UserName = User["name"];

// 15. Indexed Access Types
export type TodoProperty = ImportedUser["priority"];
export type NestedAccess = User["name" | "id"];

// 16. Complex Function Signatures
export async function complexFunction(
  simple: () => void,
  withParams: (a: string, b: number) => boolean,
  withOptional: (a?: string) => void,
  withRest: (...args: any[]) => void
): Promise<void> {
  simple();
  withParams("test", 42);
  withOptional();
  withRest(1, 2, 3);
}

complexFunction.schema = z.tuple([
  z.function().args().returns(z.void()),
  z.function().args(z.string(), z.number()).returns(z.boolean()),
  z.function().args(z.string().optional()).returns(z.void()),
  z.function().args(z.any()).returns(z.void())
]);

// 17. Promise and Array combinations
export async function fetchUserList(
  ids: number[]
): Promise<Array<User | null>> {
  return ids.map(id => ({ id, name: `User ${id}` }));
}

fetchUserList.schema = z.tuple([z.array(z.number())]);

// 18. Record and Map types
export async function processRecords(
  userRecord: Record<string, User>,
  userMap: Map<string, User>
): Promise<{ record: Record<string, User>; map: Map<string, User> }> {
  return { record: userRecord, map: userMap };
}

// Note: Zod has limited Map support
processRecords.schema = z.tuple([
  z.record(z.string(), z.object({ id: z.number(), name: z.string() })),
  z.any() // Map type
]);

// 19. Deeply nested types
export type DeepNested = {
  level1: {
    level2: {
      level3: {
        data: string[];
      };
    };
  };
};

export async function processDeepNested(
  data: Map<string, Array<Promise<User | null>>>
): Promise<DeepNested> {
  return {
    level1: {
      level2: {
        level3: {
          data: ["example"]
        }
      }
    }
  };
}

// 20. Omit and Pick utility types
export type CreateUserInput = Omit<UserWithTimestamps, "id" | "createdAt" | "updatedAt">;
export type UserPreview = Pick<User, "name">;

export async function createUser(
  input: CreateUserInput
): Promise<UserWithTimestamps> {
  return {
    ...input,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

createUser.schema = z.tuple([
  z.object({
    name: z.string()
  })
]);