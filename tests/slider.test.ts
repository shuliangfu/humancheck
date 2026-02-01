/**
 * @fileoverview 滑块验证码测试
 */

import { describe, expect, it } from "@dreamer/test";
import {
  createSliderChallenge,
  SliderChallenge,
} from "../src/challenges/slider.ts";

describe("SliderChallenge", () => {
  describe("构造函数", () => {
    it("应该使用默认配置创建实例", () => {
      const challenge = new SliderChallenge();
      expect(challenge.type).toBe("slider");
    });

    it("应该接受自定义配置", () => {
      const challenge = new SliderChallenge({
        width: 400,
        height: 80,
        tolerance: 10,
        validateTrack: true,
        validateTime: true,
      });
      expect(challenge.type).toBe("slider");
    });
  });

  describe("generate()", () => {
    it("应该生成滑块数据和答案", () => {
      const challenge = createSliderChallenge();
      const { data, answer } = challenge.generate();

      // 检查背景图片
      expect(data.background).toBeDefined();
      expect(data.background).toMatch(/^data:image\/svg\+xml;base64,/);

      // 检查尺寸
      expect(typeof data.width).toBe("number");
      expect(typeof data.height).toBe("number");

      // 检查答案
      expect(typeof answer.targetX).toBe("number");
      expect(typeof answer.tolerance).toBe("number");
    });

    it("应该使用自定义尺寸", () => {
      const challenge = createSliderChallenge({
        width: 400,
        height: 80,
      });
      const { data } = challenge.generate();

      expect(data.width).toBe(400);
      expect(data.height).toBe(80);
    });

    it("目标位置应该在有效范围内", () => {
      const challenge = createSliderChallenge({ width: 300 });

      for (let i = 0; i < 10; i++) {
        const { answer } = challenge.generate();
        // 目标位置应该在轨道范围内（width * 0.4 到 width - 35）
        // 对于 width=300，范围是 120 到 265
        const minX = 300 * 0.4; // 120
        const maxX = 300 - 35; // 265
        expect(answer.targetX >= minX && answer.targetX <= maxX).toBe(true);
      }
    });

    it("应该包含轨迹验证配置", () => {
      const challenge = createSliderChallenge({
        validateTrack: true,
        validateTime: true,
        minDragTime: 300,
        maxDragTime: 8000,
      });
      const { answer } = challenge.generate();

      expect(answer.validateTrack).toBe(true);
      expect(answer.validateTime).toBe(true);
      expect(answer.minDragTime).toBe(300);
      expect(answer.maxDragTime).toBe(8000);
    });
  });

  describe("verify()", () => {
    it("正确位置应该验证通过", () => {
      const challenge = createSliderChallenge({
        tolerance: 5,
        validateTrack: false,
        validateTime: false,
      });
      const { answer } = challenge.generate();

      // 模拟正确的滑动位置
      const result = challenge.verify(answer, { x: answer.targetX });
      expect(result.success).toBe(true);
    });

    it("接近正确位置（在容差范围内）应该验证通过", () => {
      const challenge = createSliderChallenge({
        tolerance: 5,
        validateTrack: false,
        validateTime: false,
      });
      const { answer } = challenge.generate();

      // 在容差范围内
      const result = challenge.verify(answer, { x: answer.targetX + 3 });
      expect(result.success).toBe(true);
    });

    it("超出容差范围应该验证失败", () => {
      const challenge = createSliderChallenge({
        tolerance: 5,
        validateTrack: false,
        validateTime: false,
      });
      const { answer } = challenge.generate();

      // 超出容差范围
      const result = challenge.verify(answer, { x: answer.targetX + 10 });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("时间验证：太快应该失败", () => {
      const challenge = createSliderChallenge({
        validateTime: true,
        minDragTime: 200,
        validateTrack: false,
      });
      const { answer } = challenge.generate();

      // 拖动时间太短
      const result = challenge.verify(answer, {
        x: answer.targetX,
        startTime: 1000,
        endTime: 1050, // 只有 50ms
      });
      expect(result.success).toBe(false);
    });

    it("时间验证：太慢应该失败", () => {
      const challenge = createSliderChallenge({
        validateTime: true,
        maxDragTime: 10000,
        validateTrack: false,
      });
      const { answer } = challenge.generate();

      // 拖动时间太长
      const result = challenge.verify(answer, {
        x: answer.targetX,
        startTime: 1000,
        endTime: 20000, // 19秒
      });
      expect(result.success).toBe(false);
    });

    it("轨迹验证：直线轨迹应该失败", () => {
      const challenge = createSliderChallenge({
        validateTrack: true,
        minTrackPoints: 5,
        validateTime: false,
      });
      const { answer } = challenge.generate();

      // 完美直线轨迹（机器人行为）- Y 轴完全为 0，速度恒定
      const linearTrack: Array<[number, number, number]> = [
        [0, 0, 0],
        [50, 0, 100],
        [100, 0, 200],
        [150, 0, 300],
        [200, 0, 400],
      ];

      const result = challenge.verify(answer, {
        x: answer.targetX,
        track: linearTrack,
      });
      expect(result.success).toBe(false);
    });

    it("轨迹验证：人类轨迹应该通过", () => {
      const challenge = createSliderChallenge({
        validateTrack: true,
        minTrackPoints: 5,
        validateTime: false,
        tolerance: 10,
      });
      const { answer } = challenge.generate();

      // 模拟人类轨迹（有 Y 轴抖动和速度变化）
      const humanTrack: Array<[number, number, number]> = [
        [0, 0, 0],
        [20, 2, 50],
        [60, -1, 120],
        [100, 3, 200],
        [150, -2, 350],
        [answer.targetX, 1, 500],
      ];

      const result = challenge.verify(answer, {
        x: answer.targetX,
        track: humanTrack,
      });
      expect(result.success).toBe(true);
    });

    it("非对象输入应该验证失败", () => {
      const challenge = createSliderChallenge();
      const { answer } = challenge.generate();

      const result = challenge.verify(answer, "invalid");
      expect(result.success).toBe(false);
    });

    it("缺少 x 坐标应该验证失败", () => {
      const challenge = createSliderChallenge();
      const { answer } = challenge.generate();

      const result = challenge.verify(answer, {});
      expect(result.success).toBe(false);
    });
  });
});

describe("createSliderChallenge()", () => {
  it("应该创建 SliderChallenge 实例", () => {
    const challenge = createSliderChallenge();
    expect(challenge).toBeInstanceOf(SliderChallenge);
    expect(challenge.type).toBe("slider");
  });
});
