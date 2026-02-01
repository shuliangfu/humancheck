/**
 * @module @dreamer/humancheck/challenges/slider
 *
 * @fileoverview 滑块验证码
 *
 * 生成滑块验证码，支持多种安全特性：
 * - 随机目标位置
 * - 干扰元素（线条、点、图案）
 * - 轨迹验证（检测拖动路径是否像人类）
 * - 时间验证（检测拖动时间是否合理）
 *
 * @example
 * ```typescript
 * import { createSliderChallenge } from "@dreamer/humancheck";
 *
 * const challenge = createSliderChallenge({
 *   width: 300,
 *   tolerance: 5,
 *   validateTrack: true,
 *   validateTime: true,
 * });
 *
 * const { data, answer } = challenge.generate();
 * // 客户端需要收集轨迹数据
 * ```
 */

import type {
  Challenge,
  SliderChallengeAnswer,
  SliderChallengeData,
  SliderChallengeOptions,
  SliderUserInput,
  VerifyResult,
} from "../types.ts";
import { encodeBase64, random, randomChoice, randomColor } from "../utils.ts";

/**
 * 默认干扰颜色
 */
const DEFAULT_NOISE_COLORS = [
  "#aaaaaa",
  "#bbbbbb",
  "#999999",
  "#cccccc",
  "#888888",
];

/**
 * 生成随机浅色
 *
 * @returns HEX 颜色
 */
function randomLightColor(): string {
  return randomColor({ saturation: [10, 30], lightness: [88, 95] });
}

/**
 * 生成随机噪声颜色
 *
 * @returns HEX 颜色
 */
function randomNoiseColor(): string {
  return randomColor({ saturation: [10, 40], lightness: [60, 80] });
}

/**
 * 从颜色配置获取颜色
 *
 * @param colors - 颜色配置
 * @returns 颜色值
 */
function getNoiseColor(colors: string[] | "random"): string {
  if (colors === "random") {
    return randomNoiseColor();
  }
  return randomChoice(colors);
}

/**
 * 生成滑块背景 SVG
 *
 * @param width - 宽度
 * @param height - 高度
 * @param targetX - 目标位置
 * @param options - 配置选项
 * @returns SVG 字符串
 */
function generateBackgroundSvg(
  width: number,
  height: number,
  targetX: number,
  options: {
    backgroundColor: string;
    targetColor: string;
    sliderColor: string;
    noiseLines: number;
    noiseDots: number;
    noiseColors: string[] | "random";
  },
): string {
  const {
    backgroundColor,
    targetColor,
    sliderColor,
    noiseLines,
    noiseDots,
    noiseColors,
  } = options;

  // 获取背景颜色
  const bgColor = backgroundColor === "random"
    ? randomLightColor()
    : backgroundColor;

  const targetWidth = 44;
  const targetHeight = height - 12;
  const sliderWidth = 44;
  const trackHeight = 8;

  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  // 定义渐变
  svg += `<defs>
    <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#d0d0d0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8e8e8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="targetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${targetColor};stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:${targetColor};stop-opacity:0.1" />
    </linearGradient>
  </defs>`;

  // 背景
  svg += `<rect width="100%" height="100%" fill="${bgColor}" rx="6" ry="6"/>`;

  // 背景纹理（网格线）
  for (let x = 0; x < width; x += 20) {
    const opacity = random(0.03, 0.08);
    svg +=
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#888" stroke-width="0.5" opacity="${opacity}"/>`;
  }
  for (let y = 0; y < height; y += 20) {
    const opacity = random(0.03, 0.08);
    svg +=
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#888" stroke-width="0.5" opacity="${opacity}"/>`;
  }

  // 干扰点（底层）
  for (let i = 0; i < noiseDots; i++) {
    const cx = random(0, width);
    const cy = random(0, height);
    const r = random(1, 4);
    const color = getNoiseColor(noiseColors);
    const opacity = random(0.15, 0.35);
    svg +=
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
  }

  // 干扰线（贝塞尔曲线）
  for (let i = 0; i < noiseLines; i++) {
    const x1 = random(-10, width * 0.3);
    const y1 = random(0, height);
    const x2 = random(width * 0.7, width + 10);
    const y2 = random(0, height);
    const cx1 = random(width * 0.1, width * 0.5);
    const cy1 = random(0, height);
    const cx2 = random(width * 0.5, width * 0.9);
    const cy2 = random(0, height);
    const color = getNoiseColor(noiseColors);
    const strokeWidth = random(1, 2.5);
    const opacity = random(0.2, 0.4);

    svg += `<path d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}"
            stroke="${color}" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}"/>`;
  }

  // 轨道
  const trackY = height / 2 - trackHeight / 2;
  svg += `<rect x="6" y="${trackY}" width="${
    width - 12
  }" height="${trackHeight}"
          fill="url(#trackGrad)" rx="${trackHeight / 2}" ry="${
    trackHeight / 2
  }"/>`;

  // 轨道阴影
  svg += `<rect x="6" y="${trackY}" width="${width - 12}" height="${
    trackHeight / 2
  }"
          fill="#00000010" rx="${trackHeight / 2}" ry="${trackHeight / 2}"/>`;

  // 目标区域（虚线框）
  const targetX1 = targetX - targetWidth / 2;
  svg +=
    `<rect x="${targetX1}" y="6" width="${targetWidth}" height="${targetHeight}"
          fill="url(#targetGrad)" stroke="${targetColor}" stroke-width="2"
          stroke-dasharray="6,4" rx="6" ry="6"/>`;

  // 目标区域内的图案
  for (let i = 0; i < 3; i++) {
    const cx = targetX1 + random(8, targetWidth - 8);
    const cy = random(12, targetHeight - 6);
    svg +=
      `<circle cx="${cx}" cy="${cy}" r="3" fill="${targetColor}" opacity="0.3"/>`;
  }

  // 目标箭头提示
  svg += `<text x="${targetX}" y="${
    height / 2 + 4
  }" font-size="14" font-family="Arial"
          fill="${targetColor}" text-anchor="middle" opacity="0.6">▼</text>`;

  // 滑块起始位置
  svg += `<rect x="6" y="6" width="${sliderWidth}" height="${targetHeight}"
          fill="${sliderColor}" opacity="0.7" rx="6" ry="6"/>`;
  svg += `<rect x="6" y="6" width="${sliderWidth}" height="${targetHeight / 2}"
          fill="#ffffff20" rx="6" ry="6"/>`;
  svg += `<text x="${6 + sliderWidth / 2}" y="${
    height / 2 + 5
  }" font-size="16" font-family="Arial"
          fill="white" text-anchor="middle" font-weight="bold">→</text>`;

  // 前景干扰线
  for (let i = 0; i < Math.ceil(noiseLines / 3); i++) {
    const x1 = random(sliderWidth + 10, width - 20);
    const y1 = random(0, height);
    const x2 = random(sliderWidth + 10, width - 20);
    const y2 = random(0, height);
    const color = getNoiseColor(noiseColors);
    const strokeWidth = random(0.5, 1.2);
    const opacity = random(0.1, 0.25);

    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
  }

  svg += "</svg>";

  return svg;
}

/**
 * 分析轨迹是否像人类
 *
 * @param track - 轨迹数据 [x, y, timestamp][]
 * @param minPoints - 最小点数
 * @returns 是否通过
 */
function analyzeTrack(
  track: Array<[number, number, number]>,
  minPoints: number,
): { valid: boolean; reason?: string } {
  // 检查点数
  if (track.length < minPoints) {
    return { valid: false, reason: "轨迹点数不足" };
  }

  // 检查 Y 轴是否有抖动（人类拖动不可能完全是直线）
  const yValues = track.map((p) => p[1]);
  const yMax = Math.max(...yValues);
  const yMin = Math.min(...yValues);
  const yVariation = yMax - yMin;

  // 如果 Y 轴完全没有变化，说明是机器人（人类不可能拖得这么直）
  if (yVariation < 0.5 && track.length >= minPoints) {
    return { valid: false, reason: "轨迹过于规律，Y轴无抖动" };
  }

  // 检查是否全是直线（机器人特征）
  let totalAngleChange = 0;
  for (let i = 2; i < track.length; i++) {
    const [x1, y1] = track[i - 2];
    const [x2, y2] = track[i - 1];
    const [x3, y3] = track[i];

    // 计算方向变化
    const angle1 = Math.atan2(y2 - y1, x2 - x1);
    const angle2 = Math.atan2(y3 - y2, x3 - x2);
    const angleDiff = Math.abs(angle2 - angle1);

    totalAngleChange += angleDiff;
  }

  // 如果轨迹完全是直线，可能是机器人
  const avgAngleChange = totalAngleChange / (track.length - 2);
  if (avgAngleChange < 0.01 && track.length >= minPoints) {
    return { valid: false, reason: "轨迹过于规律" };
  }

  // 检查速度变化（人类拖动会有加速和减速）
  const speeds: number[] = [];
  for (let i = 1; i < track.length; i++) {
    const [x1, , t1] = track[i - 1];
    const [x2, , t2] = track[i];
    const dt = t2 - t1;
    if (dt > 0) {
      const speed = Math.abs(x2 - x1) / dt;
      speeds.push(speed);
    }
  }

  // 检查速度是否有变化
  if (speeds.length >= 3) {
    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);
    const speedVariation = maxSpeed - minSpeed;

    // 速度完全一致可能是机器人
    if (speedVariation < 0.001 && speeds.length >= minPoints - 1) {
      return { valid: false, reason: "速度过于恒定" };
    }
  }

  return { valid: true };
}

/**
 * 滑块验证码挑战类
 *
 * 生成滑块验证码，支持轨迹和时间验证。
 *
 * @example
 * ```typescript
 * const challenge = new SliderChallenge({
 *   width: 300,
 *   tolerance: 5,
 *   validateTrack: true,
 *   validateTime: true,
 * });
 *
 * const { data, answer } = challenge.generate();
 * const result = challenge.verify(answer, {
 *   x: userX,
 *   track: [[0, 10, 0], [50, 12, 100], ...],
 *   startTime: 1234567890,
 *   endTime: 1234568890,
 * });
 * ```
 */
export class SliderChallenge
  implements Challenge<SliderChallengeData, SliderChallengeAnswer> {
  /** 挑战类型 */
  readonly type = "slider" as const;

  /** 配置选项 */
  private options: Required<SliderChallengeOptions>;

  /**
   * 创建滑块验证码挑战实例
   *
   * @param options - 配置选项
   */
  constructor(options: SliderChallengeOptions = {}) {
    this.options = {
      width: options.width ?? 300,
      height: options.height ?? 60,
      tolerance: options.tolerance ?? 5,
      backgroundColor: options.backgroundColor ?? "#f0f0f0",
      sliderColor: options.sliderColor ?? "#4caf50",
      targetColor: options.targetColor ?? "#2196f3",
      noiseLines: options.noiseLines ?? 8,
      noiseDots: options.noiseDots ?? 50,
      noiseColors: options.noiseColors ?? DEFAULT_NOISE_COLORS,
      validateTrack: options.validateTrack ?? true,
      validateTime: options.validateTime ?? true,
      minDragTime: options.minDragTime ?? 200,
      maxDragTime: options.maxDragTime ?? 10000,
      minTrackPoints: options.minTrackPoints ?? 5,
    };
  }

  /**
   * 生成验证码
   *
   * @returns 验证码数据和答案
   */
  generate(): { data: SliderChallengeData; answer: SliderChallengeAnswer } {
    // 计算目标位置（在轨道中间到末尾之间随机）
    const minX = this.options.width * 0.4;
    const maxX = this.options.width - 35;
    const targetX = Math.floor(random(minX, maxX));

    // 生成背景 SVG
    const svg = generateBackgroundSvg(
      this.options.width,
      this.options.height,
      targetX,
      {
        backgroundColor: this.options.backgroundColor,
        targetColor: this.options.targetColor,
        sliderColor: this.options.sliderColor,
        noiseLines: this.options.noiseLines,
        noiseDots: this.options.noiseDots,
        noiseColors: this.options.noiseColors,
      },
    );

    // 转换为 Base64（使用 UTF-8 安全编码）
    const base64 = encodeBase64(svg);
    const background = `data:image/svg+xml;base64,${base64}`;

    return {
      data: {
        background,
        width: this.options.width,
        height: this.options.height,
        hint: "请将滑块拖动到目标位置",
        requireTrack: this.options.validateTrack,
        requireTime: this.options.validateTime,
      },
      answer: {
        targetX,
        tolerance: this.options.tolerance,
        validateTrack: this.options.validateTrack,
        validateTime: this.options.validateTime,
        minDragTime: this.options.minDragTime,
        maxDragTime: this.options.maxDragTime,
        minTrackPoints: this.options.minTrackPoints,
      },
    };
  }

  /**
   * 验证用户输入
   *
   * @param answer - 存储的正确答案
   * @param userInput - 用户输入的答案
   * @returns 验证结果
   */
  verify(answer: SliderChallengeAnswer, userInput: unknown): VerifyResult {
    // 检查输入格式
    if (
      typeof userInput !== "object" ||
      userInput === null ||
      !("x" in userInput)
    ) {
      return {
        success: false,
        error: "滑块位置格式错误",
      };
    }

    const input = userInput as SliderUserInput;
    const userX = input.x;

    // 检查是否为数字
    if (typeof userX !== "number" || isNaN(userX)) {
      return {
        success: false,
        error: "滑块位置必须是数字",
      };
    }

    // 时间验证
    if (answer.validateTime) {
      if (input.startTime !== undefined && input.endTime !== undefined) {
        const dragTime = input.endTime - input.startTime;

        if (dragTime < answer.minDragTime) {
          return {
            success: false,
            error: "操作过快，请重试",
          };
        }

        if (dragTime > answer.maxDragTime) {
          return {
            success: false,
            error: "操作超时，请重试",
          };
        }
      }
    }

    // 轨迹验证
    if (answer.validateTrack && input.track) {
      const trackResult = analyzeTrack(input.track, answer.minTrackPoints);
      if (!trackResult.valid) {
        return {
          success: false,
          error: trackResult.reason || "轨迹验证失败",
        };
      }
    }

    // 位置验证
    const diff = Math.abs(userX - answer.targetX);

    if (diff <= answer.tolerance) {
      return {
        success: true,
        data: {
          accuracy: 1 - diff / answer.tolerance,
        },
      };
    }

    return {
      success: false,
      error: "滑块位置不正确",
      data: {
        diff,
      },
    };
  }
}

/**
 * 创建滑块验证码挑战实例
 *
 * @param options - 配置选项
 * @returns 滑块验证码挑战实例
 *
 * @example
 * ```typescript
 * import { createSliderChallenge } from "@dreamer/humancheck";
 *
 * // 基础用法
 * const challenge = createSliderChallenge();
 *
 * // 高安全性配置
 * const secureChallenge = createSliderChallenge({
 *   width: 350,
 *   height: 70,
 *   tolerance: 3,
 *   noiseLines: 12,
 *   noiseDots: 80,
 *   noiseColors: "random",
 *   validateTrack: true,
 *   validateTime: true,
 *   minDragTime: 300,
 * });
 * ```
 */
export function createSliderChallenge(
  options: SliderChallengeOptions = {},
): SliderChallenge {
  return new SliderChallenge(options);
}
