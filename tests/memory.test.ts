/**
 * @fileoverview MemoryStore 测试
 */

import { describe, expect, it } from "@dreamer/test";
import { createMemoryStore, MemoryStore } from "../src/stores/memory.ts";
import type { ChallengeRecord } from "../src/types.ts";

/**
 * 创建测试用的挑战记录
 */
function createTestRecord(
  id: string,
  options?: Partial<ChallengeRecord>,
): ChallengeRecord {
  return {
    id,
    type: "image",
    answer: "TEST",
    createdAt: Date.now(),
    expiresAt: Date.now() + 300000, // 5 分钟后过期
    attempts: 0,
    maxAttempts: 5,
    ...options,
  };
}

describe("MemoryStore", () => {
  describe("构造函数", () => {
    it("应该使用默认配置创建实例", () => {
      const store = new MemoryStore({ cleanupInterval: 0 }); // 禁用自动清理
      expect(store).toBeDefined();
    });

    it("应该接受自定义配置", () => {
      const store = new MemoryStore({
        maxRecords: 5000,
        cleanupInterval: 0, // 禁用自动清理
      });
      expect(store).toBeDefined();
    });
  });

  describe("set()", () => {
    it("应该保存记录", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });
      const record = createTestRecord("test-1");

      await store.set(record);
      const retrieved = await store.get("test-1");

      expect(retrieved?.id).toBe("test-1");
    });

    it("应该覆盖已存在的记录", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });
      const record1 = createTestRecord("test-1", { answer: "AAA" });
      const record2 = createTestRecord("test-1", { answer: "BBB" });

      await store.set(record1);
      await store.set(record2);

      const retrieved = await store.get("test-1");
      expect(retrieved?.answer).toBe("BBB");
    });
  });

  describe("get()", () => {
    it("应该获取存在的记录", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });
      const record = createTestRecord("test-1");

      await store.set(record);
      const retrieved = await store.get("test-1");

      expect(retrieved?.id).toBe("test-1");
      expect(retrieved?.type).toBe("image");
    });

    it("不存在的记录应该返回 null", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });

      const retrieved = await store.get("non-existent");
      expect(retrieved).toBeNull();
    });
  });

  describe("delete()", () => {
    it("应该删除记录", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });
      const record = createTestRecord("test-1");

      await store.set(record);
      await store.delete("test-1");

      const retrieved = await store.get("test-1");
      expect(retrieved).toBeNull();
    });

    it("删除不存在的记录不应该报错", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });

      await store.delete("non-existent");
      // 不应该抛出错误
    });
  });

  describe("update()", () => {
    it("应该更新记录", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });
      const record = createTestRecord("test-1", { attempts: 0 });

      await store.set(record);
      await store.update("test-1", { attempts: 1 });

      const retrieved = await store.get("test-1");
      expect(retrieved?.attempts).toBe(1);
    });

    it("更新不存在的记录不应该创建新记录", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });

      await store.update("non-existent", { attempts: 1 });

      const retrieved = await store.get("non-existent");
      expect(retrieved).toBeNull();
    });
  });

  describe("cleanup()", () => {
    it("应该清理过期的记录", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });

      // 创建一个已过期的记录
      const expiredRecord = createTestRecord("expired", {
        expiresAt: Date.now() - 1000, // 1 秒前过期
      });

      // 创建一个未过期的记录
      const validRecord = createTestRecord("valid", {
        expiresAt: Date.now() + 300000, // 5 分钟后过期
      });

      await store.set(expiredRecord);
      await store.set(validRecord);

      await store.cleanup();

      // 过期的应该被删除
      const expired = await store.get("expired");
      expect(expired).toBeNull();

      // 未过期的应该保留
      const valid = await store.get("valid");
      expect(valid?.id).toBe("valid");
    });
  });

  describe("size()", () => {
    it("应该返回当前记录数", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });

      expect(await store.size()).toBe(0);

      await store.set(createTestRecord("test-1"));
      expect(await store.size()).toBe(1);

      await store.set(createTestRecord("test-2"));
      expect(await store.size()).toBe(2);

      await store.delete("test-1");
      expect(await store.size()).toBe(1);
    });
  });

  describe("maxRecords 限制", () => {
    it("超过最大记录数应该淘汰旧记录", async () => {
      const store = createMemoryStore({ maxRecords: 5, cleanupInterval: 0 });

      // 添加 6 条记录
      for (let i = 0; i < 6; i++) {
        await store.set(
          createTestRecord(`test-${i}`, { createdAt: Date.now() + i }),
        );
      }

      const size = await store.size();
      expect(size <= 5).toBe(true);
    });
  });

  describe("getStats()", () => {
    it("应该返回统计信息", async () => {
      const store = createMemoryStore({ maxRecords: 100, cleanupInterval: 0 });

      await store.set(createTestRecord("test-1"));
      await store.set(createTestRecord("test-2"));

      const stats = store.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxRecords).toBe(100);
    });
  });

  describe("clear()", () => {
    it("应该清空所有记录", async () => {
      const store = createMemoryStore({ cleanupInterval: 0 });

      await store.set(createTestRecord("test-1"));
      await store.set(createTestRecord("test-2"));

      store.clear();

      expect(await store.size()).toBe(0);
    });
  });

  describe("destroy()", () => {
    it("应该销毁存储并停止自动清理", () => {
      const store = createMemoryStore({ cleanupInterval: 1000 });

      store.destroy();
      // 不应该抛出错误
    });
  });
});

describe("createMemoryStore({ cleanupInterval: 0 })", () => {
  it("应该创建 MemoryStore 实例", () => {
    const store = createMemoryStore({ cleanupInterval: 0 }); // 禁用自动清理
    expect(store).toBeInstanceOf(MemoryStore);
  });
});
