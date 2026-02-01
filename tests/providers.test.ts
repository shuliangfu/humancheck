/**
 * @fileoverview 第三方服务提供者测试
 */

import { describe, expect, it } from "@dreamer/test";
import {
  createRecaptchaProvider,
  createTurnstileProvider,
  RecaptchaProvider,
  TurnstileProvider,
} from "../src/mod.ts";

describe("RecaptchaProvider", () => {
  describe("构造函数", () => {
    it("应该使用配置创建实例", () => {
      const provider = new RecaptchaProvider({
        siteKey: "test-site-key",
        secretKey: "test-secret-key",
      });
      expect(provider).toBeDefined();
    });

    it("应该接受 v3 配置", () => {
      const provider = new RecaptchaProvider({
        siteKey: "test-site-key",
        secretKey: "test-secret-key",
        version: "v3",
        minScore: 0.7,
      });
      expect(provider.getVersion()).toBe("v3");
    });

    it("缺少 secretKey 应该抛出错误", () => {
      expect(() => {
        new RecaptchaProvider({
          siteKey: "test-site-key",
          secretKey: "",
        });
      }).toThrow("reCAPTCHA secretKey 是必需的");
    });
  });

  describe("getSiteKey()", () => {
    it("应该返回站点密钥", () => {
      const provider = createRecaptchaProvider({
        siteKey: "my-site-key",
        secretKey: "my-secret-key",
      });
      expect(provider.getSiteKey()).toBe("my-site-key");
    });
  });

  describe("getVersion()", () => {
    it("默认应该返回 v2", () => {
      const provider = createRecaptchaProvider({
        siteKey: "test",
        secretKey: "test",
      });
      expect(provider.getVersion()).toBe("v2");
    });

    it("配置 v3 应该返回 v3", () => {
      const provider = createRecaptchaProvider({
        siteKey: "test",
        secretKey: "test",
        version: "v3",
      });
      expect(provider.getVersion()).toBe("v3");
    });
  });

  describe("verify()", () => {
    it("空 token 应该验证失败", async () => {
      const provider = createRecaptchaProvider({
        siteKey: "test",
        secretKey: "test",
      });

      const result = await provider.verify("");
      expect(result.success).toBe(false);
      expect(result.error).toBe("token 不能为空");
    });

    // 注意：实际验证需要有效的密钥，这里只测试参数验证
  });
});

describe("createRecaptchaProvider()", () => {
  it("应该创建 RecaptchaProvider 实例", () => {
    const provider = createRecaptchaProvider({
      siteKey: "test",
      secretKey: "test",
    });
    expect(provider).toBeInstanceOf(RecaptchaProvider);
  });
});

describe("TurnstileProvider", () => {
  describe("构造函数", () => {
    it("应该使用配置创建实例", () => {
      const provider = new TurnstileProvider({
        siteKey: "test-site-key",
        secretKey: "test-secret-key",
      });
      expect(provider).toBeDefined();
    });

    it("缺少 secretKey 应该抛出错误", () => {
      expect(() => {
        new TurnstileProvider({
          siteKey: "test-site-key",
          secretKey: "",
        });
      }).toThrow("Turnstile secretKey 是必需的");
    });
  });

  describe("getSiteKey()", () => {
    it("应该返回站点密钥", () => {
      const provider = createTurnstileProvider({
        siteKey: "my-site-key",
        secretKey: "my-secret-key",
      });
      expect(provider.getSiteKey()).toBe("my-site-key");
    });
  });

  describe("verify()", () => {
    it("空 token 应该验证失败", async () => {
      const provider = createTurnstileProvider({
        siteKey: "test",
        secretKey: "test",
      });

      const result = await provider.verify("");
      expect(result.success).toBe(false);
      expect(result.error).toBe("token 不能为空");
    });

    // 注意：实际验证需要有效的密钥，这里只测试参数验证
  });
});

describe("createTurnstileProvider()", () => {
  it("应该创建 TurnstileProvider 实例", () => {
    const provider = createTurnstileProvider({
      siteKey: "test",
      secretKey: "test",
    });
    expect(provider).toBeInstanceOf(TurnstileProvider);
  });
});
