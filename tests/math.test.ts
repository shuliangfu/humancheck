/**
 * @fileoverview 数学验证码测试
 */

import { describe, expect, it } from "@dreamer/test";
import { createMathChallenge, MathChallenge } from "../src/challenges/math.ts";

describe("MathChallenge", () => {
  describe("构造函数", () => {
    it("应该使用默认配置创建实例", () => {
      const challenge = new MathChallenge();
      expect(challenge.type).toBe("math");
    });

    it("应该接受自定义配置", () => {
      const challenge = new MathChallenge({
        minNumber: 1,
        maxNumber: 50,
        operators: ["+", "-"],
        asImage: true,
      });
      expect(challenge.type).toBe("math");
    });
  });

  describe("generate()", () => {
    it("应该生成数学问题和答案", () => {
      const challenge = createMathChallenge({ asImage: false });
      const { data, answer } = challenge.generate();

      // 检查问题格式
      expect(data.question).toBeDefined();
      expect(data.question).toMatch(/^\d+\s*[+\-×]\s*\d+\s*=\s*\?$/);

      // 检查答案是数字
      expect(typeof answer).toBe("number");
    });

    it("应该生成图片格式的数学问题", () => {
      const challenge = createMathChallenge({ asImage: true });
      const { data } = challenge.generate();

      // 检查图片是否为 Base64 SVG
      expect(data.image).toBeDefined();
      expect(data.image).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it("应该在指定范围内生成数字", () => {
      const challenge = createMathChallenge({
        minNumber: 1,
        maxNumber: 10,
        asImage: false,
      });

      // 生成多次验证
      for (let i = 0; i < 20; i++) {
        const { data } = challenge.generate();
        const numbers = data.question.match(/\d+/g);
        if (numbers) {
          numbers.forEach((n) => {
            const num = parseInt(n, 10);
            expect(num >= 1 && num <= 10).toBe(true);
          });
        }
      }
    });

    it("应该使用指定的运算符", () => {
      const challenge = createMathChallenge({
        operators: ["+"],
        asImage: false,
      });

      for (let i = 0; i < 10; i++) {
        const { data } = challenge.generate();
        expect(data.question).toMatch(/\+/);
      }
    });
  });

  describe("verify()", () => {
    it("正确答案应该验证通过", () => {
      const challenge = createMathChallenge({ asImage: false });
      const { answer } = challenge.generate();

      const result = challenge.verify(answer, answer);
      expect(result.success).toBe(true);
    });

    it("错误答案应该验证失败", () => {
      const challenge = createMathChallenge({ asImage: false });
      const { answer } = challenge.generate();

      const result = challenge.verify(answer, answer + 1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("字符串形式的数字也应该验证通过", () => {
      const challenge = createMathChallenge({ asImage: false });
      const { answer } = challenge.generate();

      const result = challenge.verify(answer, String(answer));
      expect(result.success).toBe(true);
    });

    it("非数字输入应该验证失败", () => {
      const challenge = createMathChallenge();

      const result = challenge.verify(10, "abc");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe("createMathChallenge()", () => {
  it("应该创建 MathChallenge 实例", () => {
    const challenge = createMathChallenge();
    expect(challenge).toBeInstanceOf(MathChallenge);
    expect(challenge.type).toBe("math");
  });
});
