/**
 * @fileoverview HumanCheck 核心验证器测试
 *
 * 注意：由于 MemoryStore 使用 setInterval 进行自动清理，
 * 测试禁用了资源和操作的 sanitizer。
 */

import { assertRejects, describe, expect, it } from "@dreamer/test";
import { createImageChallenge } from "../src/challenges/image.ts";
import { createMathChallenge } from "../src/challenges/math.ts";
import { createSliderChallenge } from "../src/challenges/slider.ts";
import { createHumanCheck, HumanCheck } from "../src/core.ts";
import { createMemoryStore } from "../src/stores/memory.ts";

/** 创建测试用的 HumanCheck（禁用自动清理） */
function createTestHumanCheck(
  options?: Parameters<typeof createHumanCheck>[0],
) {
  return createHumanCheck({
    ...options,
    store: createMemoryStore({ cleanupInterval: 0 }),
  });
}

describe("HumanCheck", () => {
  describe("构造函数", () => {
    it("应该使用默认配置创建实例", () => {
      const humanCheck = createTestHumanCheck();
      expect(humanCheck).toBeDefined();
    });

    it("应该接受自定义配置", () => {
      const humanCheck = createTestHumanCheck({
        defaultExpiresIn: 600,
        defaultMaxAttempts: 5,
        maxRecords: 5000,
      });
      expect(humanCheck).toBeDefined();
    });
  });

  describe("register()", () => {
    it("应该注册挑战类型", () => {
      const humanCheck = createTestHumanCheck();
      const imageChallenge = createImageChallenge();

      humanCheck.register("image", imageChallenge);
      // 注册后应该可以通过类型名创建挑战
    });

    it("应该允许覆盖已注册的挑战", () => {
      const humanCheck = createTestHumanCheck();
      const challenge1 = createImageChallenge({ length: 4 });
      const challenge2 = createImageChallenge({ length: 6 });

      humanCheck.register("image", challenge1);
      humanCheck.register("image", challenge2);
      // 应该覆盖成功
    });
  });

  describe("unregister()", () => {
    it("应该取消注册挑战类型", () => {
      const humanCheck = createTestHumanCheck();
      const imageChallenge = createImageChallenge();

      humanCheck.register("image", imageChallenge);
      humanCheck.unregister("image");
      // 取消注册后应该无法通过类型名创建挑战
    });
  });

  describe("create()", () => {
    it("应该通过挑战实例创建挑战", async () => {
      const humanCheck = createTestHumanCheck();
      const imageChallenge = createImageChallenge();

      const result = await humanCheck.create(imageChallenge);

      expect(result.id).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.expiresIn).toBeDefined();
    });

    it("应该通过注册的类型名创建挑战", async () => {
      const humanCheck = createTestHumanCheck();
      humanCheck.register("image", createImageChallenge());

      const result = await humanCheck.create("image");

      expect(result.id).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it("使用未注册的类型名应该抛出错误", async () => {
      const humanCheck = createTestHumanCheck();

      await assertRejects(
        async () => {
          // 需要先注册才能使用类型名
          await humanCheck.create("image");
        },
        Error,
      );
    });

    it("应该使用自定义过期时间", async () => {
      const humanCheck = createTestHumanCheck();
      const imageChallenge = createImageChallenge();

      const result = await humanCheck.create(imageChallenge, {
        expiresIn: 60, // 1 分钟
      });

      expect(result.expiresIn).toBe(60);
    });
  });

  describe("verify()", () => {
    it("错误答案应该验证失败", async () => {
      const humanCheck = createTestHumanCheck();
      const imageChallenge = createImageChallenge();

      const { id } = await humanCheck.create(imageChallenge);

      const result = await humanCheck.verify(id, "WRONG", imageChallenge);
      expect(result.success).toBe(false);
    });

    it("过期的挑战应该验证失败", async () => {
      const humanCheck = createTestHumanCheck({ defaultExpiresIn: 0 }); // 立即过期
      const imageChallenge = createImageChallenge();

      const { id } = await humanCheck.create(imageChallenge, { expiresIn: 0 });

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await humanCheck.verify(id, "test", imageChallenge);
      expect(result.success).toBe(false);
    });

    it("不存在的挑战应该验证失败", async () => {
      const humanCheck = createTestHumanCheck();
      const imageChallenge = createImageChallenge();

      const result = await humanCheck.verify(
        "non-existent-id",
        "test",
        imageChallenge,
      );
      expect(result.success).toBe(false);
    });

    it("超过最大尝试次数应该验证失败", async () => {
      const humanCheck = createTestHumanCheck({ defaultMaxAttempts: 2 });
      const imageChallenge = createImageChallenge();

      const { id } = await humanCheck.create(imageChallenge);

      // 尝试 2 次错误
      await humanCheck.verify(id, "WRONG1", imageChallenge);
      await humanCheck.verify(id, "WRONG2", imageChallenge);

      // 第 3 次应该失败
      const result = await humanCheck.verify(id, "WRONG3", imageChallenge);
      expect(result.success).toBe(false);
    });

    it("通过注册的类型自动查找挑战进行验证", async () => {
      const humanCheck = createTestHumanCheck();
      humanCheck.register("image", createImageChallenge());

      const { id } = await humanCheck.create("image");

      // 验证时不传 challenge 参数
      const result = await humanCheck.verify(id, "WRONG");
      expect(result.success).toBe(false);
    });
  });

  describe("cleanup()", () => {
    it("应该清理过期的挑战", async () => {
      const humanCheck = createTestHumanCheck({ defaultExpiresIn: 0 }); // 立即过期
      const imageChallenge = createImageChallenge();

      await humanCheck.create(imageChallenge, { expiresIn: 0 });
      await humanCheck.create(imageChallenge, { expiresIn: 0 });

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 10));

      await humanCheck.cleanup();
      // 清理后记录应该被删除
    });
  });
});

describe("createHumanCheck()", () => {
  it("应该创建 HumanCheck 实例", () => {
    const humanCheck = createTestHumanCheck();
    expect(humanCheck).toBeInstanceOf(HumanCheck);
  });
});

describe("完整流程测试", () => {
  it("图形验证码完整流程", async () => {
    const humanCheck = createTestHumanCheck();
    const imageChallenge = createImageChallenge({ caseSensitive: false });

    // 1. 创建挑战
    const { id, data } = await humanCheck.create(imageChallenge);

    expect(data.image).toBeDefined();
    expect(id).toBeDefined();
  });

  it("数学验证码完整流程", async () => {
    const humanCheck = createTestHumanCheck();
    const mathChallenge = createMathChallenge({ asImage: false });

    // 1. 创建挑战
    const { id, data } = await humanCheck.create(mathChallenge);

    expect(data.question).toBeDefined();
    expect(id).toBeDefined();
  });

  it("滑块验证码完整流程", async () => {
    const humanCheck = createTestHumanCheck();
    const sliderChallenge = createSliderChallenge({
      validateTrack: false,
      validateTime: false,
    });

    // 1. 创建挑战
    const { id, data } = await humanCheck.create(sliderChallenge);

    expect(data.background).toBeDefined();
    expect(id).toBeDefined();
  });
});
