/**
 * Branded types for type-safe IDs
 * These prevent accidentally mixing different ID types
 */

// Brand type helper
type Brand<K, T> = K & { __brand: T };

// Branded ID types
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type ProductId = Brand<string, "ProductId">;
export type SessionId = Brand<string, "SessionId">;

// Type guards
export function isUserId(value: string): value is UserId {
  return value.startsWith("user_");
}

export function isOrderId(value: string): value is OrderId {
  return value.startsWith("order_");
}

export function isProductId(value: string): value is ProductId {
  return value.startsWith("prod_");
}

export function isSessionId(value: string): value is SessionId {
  return value.startsWith("sess_");
}

// Factory functions
export function createUserId(id: string): UserId {
  return `user_${id}` as UserId;
}

export function createOrderId(id: string): OrderId {
  return `order_${id}` as OrderId;
}

export function createProductId(id: string): ProductId {
  return `prod_${id}` as ProductId;
}

export function createSessionId(id: string): SessionId {
  return `sess_${id}` as SessionId;
}