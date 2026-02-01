/**
 * @module @dreamer/humancheck/stores
 *
 * @fileoverview 存储适配器模块
 *
 * 提供多种存储后端实现：
 * - MemoryStore: 内存存储（默认，支持容量限制和自动清理）
 *
 * @example
 * ```typescript
 * import { MemoryStore, createMemoryStore } from "@dreamer/humancheck";
 *
 * const store = createMemoryStore({
 *   maxRecords: 5000,
 *   cleanupInterval: 30000,
 * });
 * ```
 */

export { createMemoryStore, MemoryStore } from "./memory.ts";
