/**
 * @fileoverview TOTP 测试
 */

import { describe, expect, it } from "@dreamer/test";
import { createTotp, Totp } from "../src/otp/totp.ts";

describe("Totp 类", () => {
  describe("构造函数", () => {
    it("应该使用默认配置创建实例", () => {
      const totp = new Totp();
      expect(totp).toBeDefined();
    });

    it("应该接受自定义配置", () => {
      const totp = new Totp({
        issuer: "TestApp",
        period: 60,
        digits: 8,
      });
      expect(totp).toBeDefined();
    });
  });

  describe("generateSecret()", () => {
    it("应该生成密钥和 URI", () => {
      const totp = createTotp({ issuer: "TestApp" });
      const result = totp.generateSecret("user@example.com");

      expect(result.secret).toBeDefined();
      expect(result.otpauthUrl).toBeDefined();
      expect(result.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    });

    it("密钥应该是 Base32 格式", () => {
      const totp = createTotp();
      const result = totp.generateSecret("test@example.com");

      // Base32 只包含 A-Z 和 2-7
      expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    });

    it("URI 应该包含正确的参数", () => {
      const totp = createTotp({
        issuer: "MyApp",
        period: 30,
        digits: 6,
      });
      const result = totp.generateSecret("test@example.com");

      // 检查 URI 格式
      expect(result.otpauthUrl).toMatch(/issuer=MyApp/);
      expect(result.otpauthUrl).toMatch(/period=30/);
      expect(result.otpauthUrl).toMatch(/digits=6/);
    });

    it("应该生成二维码", () => {
      const totp = createTotp();
      const result = totp.generateSecret("test@example.com");

      expect(result.qrCode).toBeDefined();
      expect(result.qrCode).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it("每次生成的密钥应该不同", () => {
      const totp = createTotp();
      const secrets = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const result = totp.generateSecret(`user${i}@example.com`);
        secrets.add(result.secret);
      }

      expect(secrets.size).toBe(10);
    });
  });

  describe("generate()", () => {
    it("应该生成 6 位数字验证码", async () => {
      const totp = createTotp({ digits: 6 });
      const { secret } = totp.generateSecret("test@example.com");

      const code = await totp.generate(secret);

      expect(code.length).toBe(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    it("应该生成 8 位数字验证码", async () => {
      const totp = createTotp({ digits: 8 });
      const { secret } = totp.generateSecret("test@example.com");

      const code = await totp.generate(secret);

      expect(code.length).toBe(8);
      expect(code).toMatch(/^\d{8}$/);
    });

    it("相同时间戳应该生成相同的验证码", async () => {
      const totp = createTotp();
      const { secret } = totp.generateSecret("test@example.com");
      const timestamp = Date.now();

      const code1 = await totp.generate(secret, timestamp);
      const code2 = await totp.generate(secret, timestamp);

      expect(code1).toBe(code2);
    });

    it("不同密钥应该生成不同的验证码", async () => {
      const totp = createTotp();
      const result1 = totp.generateSecret("user1@example.com");
      const result2 = totp.generateSecret("user2@example.com");

      const code1 = await totp.generate(result1.secret);
      const code2 = await totp.generate(result2.secret);

      // 虽然有极小概率相同，但测试足够多次应该不同
      expect(code1 !== code2).toBe(true);
    });
  });

  describe("verify()", () => {
    it("正确的验证码应该验证通过", async () => {
      const totp = createTotp();
      const { secret } = totp.generateSecret("test@example.com");
      const code = await totp.generate(secret);

      const result = await totp.verify(secret, code);
      expect(result.success).toBe(true);
    });

    it("错误的验证码应该验证失败", async () => {
      const totp = createTotp();
      const { secret } = totp.generateSecret("test@example.com");

      const result = await totp.verify(secret, "000000");
      expect(result.success).toBe(false);
    });

    it("非数字验证码应该验证失败", async () => {
      const totp = createTotp();
      const { secret } = totp.generateSecret("test@example.com");

      const result = await totp.verify(secret, "abcdef");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("长度不对的验证码应该验证失败", async () => {
      const totp = createTotp({ digits: 6 });
      const { secret } = totp.generateSecret("test@example.com");

      const result = await totp.verify(secret, "12345"); // 只有 5 位
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("应该允许时间窗口偏移", async () => {
      const totp = createTotp({ window: 1 });
      const { secret } = totp.generateSecret("test@example.com");
      const code = await totp.generate(secret);

      // 当前时间的验证码应该通过
      const result = await totp.verify(secret, code);
      expect(result.success).toBe(true);
    });
  });

  describe("getRemainingTime()", () => {
    it("应该返回剩余秒数", () => {
      const totp = createTotp({ period: 30 });
      const remaining = totp.getRemainingTime();

      expect(remaining >= 1 && remaining <= 30).toBe(true);
    });

    it("应该根据指定时间戳计算", () => {
      const totp = createTotp({ period: 30 });
      // 选择一个时间戳，使得 elapsed = 10 秒
      const timestamp = 10 * 1000; // 10 秒

      const remaining = totp.getRemainingTime(timestamp);
      expect(remaining).toBe(20); // 30 - 10 = 20
    });
  });
});

describe("createTotp()", () => {
  it("应该创建 Totp 实例", () => {
    const totp = createTotp();
    expect(totp).toBeInstanceOf(Totp);
  });

  it("应该接受配置选项", () => {
    const totp = createTotp({
      issuer: "TestApp",
      digits: 8,
      period: 60,
    });
    expect(totp).toBeDefined();
  });
});
