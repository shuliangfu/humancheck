/**
 * @fileoverview 图形验证码测试
 */

import { describe, expect, it } from "@dreamer/test";
import {
  createImageChallenge,
  ImageChallenge,
} from "../src/challenges/image.ts";

describe("ImageChallenge", () => {
  describe("构造函数", () => {
    it("应该使用默认配置创建实例", () => {
      const challenge = new ImageChallenge();
      expect(challenge.type).toBe("image");
    });

    it("应该接受自定义配置", () => {
      const challenge = new ImageChallenge({
        length: 6,
        width: 200,
        height: 60,
        caseSensitive: true,
      });
      expect(challenge.type).toBe("image");
    });
  });

  describe("generate()", () => {
    it("应该生成验证码数据和答案", () => {
      const challenge = createImageChallenge({ length: 4 });
      const { data, answer } = challenge.generate();

      // 检查答案长度
      expect(answer.length).toBe(4);

      // 检查图片是否为 Base64 SVG
      expect(data.image).toBeDefined();
      expect(data.image).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it("应该生成指定长度的验证码", () => {
      const challenge = createImageChallenge({ length: 6 });
      const { answer } = challenge.generate();
      expect(answer.length).toBe(6);
    });

    it("应该使用自定义字符集", () => {
      const challenge = createImageChallenge({
        length: 4,
        charset: "0123456789",
      });
      const { answer } = challenge.generate();

      // 验证只包含数字
      expect(answer).toMatch(/^\d{4}$/);
    });

    it("每次生成的验证码应该不同", () => {
      const challenge = createImageChallenge({ length: 4 });
      const results = new Set<string>();

      // 生成 10 个验证码
      for (let i = 0; i < 10; i++) {
        const { answer } = challenge.generate();
        results.add(answer);
      }

      // 至少应该有多个不同的结果
      expect(results.size > 1).toBe(true);
    });
  });

  describe("verify()", () => {
    it("正确答案应该验证通过", () => {
      const challenge = createImageChallenge({ caseSensitive: false });
      const { answer } = challenge.generate();

      const result = challenge.verify(answer, answer);
      expect(result.success).toBe(true);
    });

    it("错误答案应该验证失败", () => {
      const challenge = createImageChallenge();
      const { answer } = challenge.generate();

      const result = challenge.verify(answer, "WRONG");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("大小写不敏感时应该忽略大小写", () => {
      const challenge = createImageChallenge({ caseSensitive: false });

      // 使用已知答案测试
      const result1 = challenge.verify("ABCD", "abcd");
      expect(result1.success).toBe(true);

      const result2 = challenge.verify("abcd", "ABCD");
      expect(result2.success).toBe(true);
    });

    it("大小写敏感时应该区分大小写", () => {
      const challenge = createImageChallenge({ caseSensitive: true });

      const result = challenge.verify("ABCD", "abcd");
      expect(result.success).toBe(false);
    });

    it("长度不匹配应该验证失败", () => {
      const challenge = createImageChallenge({ length: 4 });

      const result = challenge.verify("ABCD", "ABC");
      expect(result.success).toBe(false);
    });

    it("非字符串输入应该验证失败", () => {
      const challenge = createImageChallenge();

      const result = challenge.verify("ABCD", 1234);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe("createImageChallenge()", () => {
  it("应该创建 ImageChallenge 实例", () => {
    const challenge = createImageChallenge();
    expect(challenge).toBeInstanceOf(ImageChallenge);
    expect(challenge.type).toBe("image");
  });
});
