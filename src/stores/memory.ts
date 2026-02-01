/**
 * @module @dreamer/humancheck/stores/memory
 *
 * @fileoverview 内存存储适配器
 *
 * 提供基于内存的挑战记录存储，支持：
 * - 容量限制（防止内存溢出）
 * - 自动清理过期记录
 * - O(1) 时间复杂度的 LRU 淘汰策略
 *
 * @example
 * ```typescript
 * import { createMemoryStore } from "@dreamer/humancheck";
 *
 * const store = createMemoryStore({
 *   maxRecords: 5000,
 *   cleanupInterval: 60000,
 * });
 *
 * const humanCheck = createHumanCheck({ store });
 * ```
 */

import type { ChallengeRecord, MemoryStoreOptions, Store } from "../types.ts";

/**
 * 双向链表节点
 *
 * 用于实现 O(1) 的 LRU 淘汰策略。
 */
interface ListNode {
  /** 记录 ID */
  id: string;
  /** 前一个节点 */
  prev: ListNode | null;
  /** 后一个节点 */
  next: ListNode | null;
}

/**
 * 内存存储类
 *
 * 使用 Map + 双向链表存储挑战记录，支持 O(1) 的增删改查和 LRU 淘汰。
 *
 * @example
 * ```typescript
 * const store = new MemoryStore({
 *   maxRecords: 10000,
 *   cleanupInterval: 60000,
 * });
 * ```
 */
export class MemoryStore implements Store {
  /** 存储记录（id -> record） */
  private records: Map<string, ChallengeRecord> = new Map();

  /** 链表节点索引（id -> node），用于 O(1) 访问节点 */
  private nodeIndex: Map<string, ListNode> = new Map();

  /** 链表头（最旧的记录） */
  private head: ListNode | null = null;

  /** 链表尾（最新的记录） */
  private tail: ListNode | null = null;

  /** 配置选项 */
  private options: Required<MemoryStoreOptions>;

  /** 清理定时器 ID */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 创建内存存储实例
   *
   * @param options - 配置选项
   */
  constructor(options: MemoryStoreOptions = {}) {
    this.options = {
      maxRecords: options.maxRecords ?? 10000,
      cleanupInterval: options.cleanupInterval ?? 60000,
      debug: options.debug ?? false,
    };

    // 启动自动清理
    if (this.options.cleanupInterval > 0) {
      this.startAutoCleanup();
    }
  }

  /**
   * 保存挑战记录
   *
   * @param record - 挑战记录
   */
  set(record: ChallengeRecord): Promise<void> {
    // 如果记录已存在，先移除旧节点
    if (this.records.has(record.id)) {
      this.removeNode(record.id);
    } // 如果超过容量限制，淘汰最旧的记录
    else if (this.records.size >= this.options.maxRecords) {
      this.evictOldest();
    }

    // 保存记录
    this.records.set(record.id, record);

    // 添加到链表尾部（最新）
    this.appendNode(record.id);

    if (this.options.debug) {
      console.log(
        `[MemoryStore] 保存记录: id=${record.id}, size=${this.records.size}`,
      );
    }

    return Promise.resolve();
  }

  /**
   * 获取挑战记录
   *
   * @param id - 挑战 ID
   * @returns 挑战记录或 null
   */
  get(id: string): Promise<ChallengeRecord | null> {
    const record = this.records.get(id) ?? null;
    return Promise.resolve(record);
  }

  /**
   * 删除挑战记录
   *
   * @param id - 挑战 ID
   */
  delete(id: string): Promise<void> {
    if (this.records.has(id)) {
      this.records.delete(id);
      this.removeNode(id);
    }
    return Promise.resolve();
  }

  /**
   * 更新挑战记录
   *
   * @param id - 挑战 ID
   * @param updates - 部分更新
   */
  update(id: string, updates: Partial<ChallengeRecord>): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      this.records.set(id, { ...record, ...updates });
    }
    return Promise.resolve();
  }

  /**
   * 清理过期记录
   */
  cleanup(): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];

    // 收集过期记录
    for (const [id, record] of this.records) {
      if (now > record.expiresAt) {
        toDelete.push(id);
      }
    }

    // 批量删除
    for (const id of toDelete) {
      this.records.delete(id);
      this.removeNode(id);
    }

    if (this.options.debug && toDelete.length > 0) {
      console.log(
        `[MemoryStore] 清理过期记录: ${toDelete.length} 条, 剩余 ${this.records.size} 条`,
      );
    }

    return Promise.resolve();
  }

  /**
   * 获取当前记录数
   *
   * @returns 记录数
   */
  size(): Promise<number> {
    return Promise.resolve(this.records.size);
  }

  /**
   * 添加节点到链表尾部
   *
   * @param id - 记录 ID
   */
  private appendNode(id: string): void {
    const node: ListNode = { id, prev: this.tail, next: null };

    if (this.tail) {
      this.tail.next = node;
    }
    this.tail = node;

    if (!this.head) {
      this.head = node;
    }

    this.nodeIndex.set(id, node);
  }

  /**
   * 从链表移除节点
   *
   * @param id - 记录 ID
   */
  private removeNode(id: string): void {
    const node = this.nodeIndex.get(id);
    if (!node) return;

    // 更新前后节点的指针
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      // 节点是头节点
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      // 节点是尾节点
      this.tail = node.prev;
    }

    this.nodeIndex.delete(id);
  }

  /**
   * 淘汰最旧的记录（O(1) 时间复杂度）
   *
   * 优先淘汰已过期的记录，如果没有过期记录则淘汰最旧的。
   */
  private evictOldest(): void {
    const now = Date.now();
    let evicted = false;

    // 优先淘汰已过期的记录
    if (this.head) {
      const record = this.records.get(this.head.id);
      if (record && now > record.expiresAt) {
        this.records.delete(this.head.id);
        this.removeNode(this.head.id);
        evicted = true;
      }
    }

    // 如果没有过期记录，直接淘汰最旧的
    if (!evicted && this.head) {
      const id = this.head.id;
      this.records.delete(id);
      this.removeNode(id);

      if (this.options.debug) {
        console.log(`[MemoryStore] 淘汰最旧记录: ${id}`);
      }
    }
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    // 如果环境支持 unref，防止定时器阻止进程退出
    if (
      this.cleanupTimer &&
      typeof this.cleanupTimer === "object" &&
      "unref" in this.cleanupTimer
    ) {
      (this.cleanupTimer as { unref: () => void }).unref();
    }
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 清空所有记录
   */
  clear(): void {
    this.records.clear();
    this.nodeIndex.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * 销毁存储
   *
   * 停止自动清理并清空记录。
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clear();
  }

  /**
   * 获取统计信息
   *
   * @returns 统计信息
   */
  getStats(): {
    size: number;
    maxRecords: number;
    expiredCount: number;
  } {
    const now = Date.now();
    let expiredCount = 0;

    for (const record of this.records.values()) {
      if (now > record.expiresAt) {
        expiredCount++;
      }
    }

    return {
      size: this.records.size,
      maxRecords: this.options.maxRecords,
      expiredCount,
    };
  }
}

/**
 * 创建内存存储实例
 *
 * @param options - 配置选项
 * @returns 内存存储实例
 *
 * @example
 * ```typescript
 * import { createMemoryStore, createHumanCheck } from "@dreamer/humancheck";
 *
 * // 创建带容量限制的存储
 * const store = createMemoryStore({
 *   maxRecords: 5000,
 *   cleanupInterval: 30000,
 * });
 *
 * // 使用自定义存储
 * const humanCheck = createHumanCheck({ store });
 * ```
 */
export function createMemoryStore(
  options: MemoryStoreOptions = {},
): MemoryStore {
  return new MemoryStore(options);
}
