/**
 * @module @dreamer/humancheck/challenges/image
 *
 * @fileoverview 图形验证码
 *
 * 生成 SVG 格式的图形验证码，支持多种干扰元素：
 * - 贝塞尔曲线干扰线
 * - 干扰点
 * - 干扰圆弧
 * - 文字旋转和缩放
 * - 文字描边
 * - 随机颜色
 * - 自定义字体
 *
 * @example
 * ```typescript
 * import { createImageChallenge } from "@dreamer/humancheck";
 *
 * const challenge = createImageChallenge({
 *   length: 4,
 *   width: 150,
 *   height: 50,
 *   noiseLines: 8,
 *   noiseDots: 100,
 *   noiseArcs: 5,
 *   textColors: "random",
 * });
 *
 * const { data, answer } = challenge.generate();
 * console.log(data.image); // data:image/svg+xml;base64,...
 * ```
 */

import type {
  Challenge,
  ImageChallengeData,
  ImageChallengeOptions,
  VerifyResult,
} from "../types.ts";
import {
  encodeBase64,
  random,
  randomChoice,
  randomColor,
  randomInt,
} from "../utils.ts";

/**
 * 默认字符集（排除易混淆字符：0, O, 1, I, l）
 */
const DEFAULT_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * 默认文字颜色（深色系，确保可读性）
 */
const DEFAULT_TEXT_COLORS = [
  "#1a1a1a",
  "#2d2d2d",
  "#0055aa",
  "#aa5500",
  "#005533",
  "#553300",
  "#330055",
  "#003355",
];

/**
 * 默认干扰颜色
 */
const DEFAULT_NOISE_COLORS = [
  "#666666",
  "#888888",
  "#4488cc",
  "#cc8844",
  "#44cc88",
  "#8844cc",
  "#cc4488",
  "#88cc44",
];

/**
 * 默认字体列表
 */
const DEFAULT_FONTS = [
  "Arial",
  "Helvetica",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Courier New",
];

/**
 * 生成随机深色（用于文字，确保可读性）
 *
 * @returns 随机深色 HEX
 */
function randomDarkColor(): string {
  return randomColor({ saturation: [50, 80], lightness: [25, 45] });
}

/**
 * 生成随机浅色（用于背景）
 *
 * @returns 随机浅色 HEX
 */
function randomLightColor(): string {
  return randomColor({ saturation: [10, 30], lightness: [90, 98] });
}

/**
 * 生成随机中等颜色（用于干扰元素）
 *
 * @returns 随机中等颜色 HEX
 */
function randomNoiseColor(): string {
  return randomColor({ saturation: [30, 70], lightness: [40, 70] });
}

/**
 * 从颜色配置获取颜色
 *
 * @param colors - 颜色配置
 * @param type - 颜色类型
 * @returns 颜色值
 */
function getColorByType(
  colors: string[] | "random",
  type: "text" | "noise" | "background",
): string {
  if (colors === "random") {
    switch (type) {
      case "text":
        return randomDarkColor();
      case "noise":
        return randomNoiseColor();
      case "background":
        return randomLightColor();
    }
  }
  return randomChoice(colors);
}

/**
 * 生成随机验证码文本
 *
 * @param length - 验证码长度
 * @param charset - 字符集
 * @returns 随机验证码文本
 */
function generateCode(length: number, charset: string): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += randomChoice(charset.split(""));
  }
  return code;
}

/**
 * 内部 SVG 生成选项类型
 */
interface SvgOptions {
  width: number;
  height: number;
  noiseLines: number;
  noiseDots: number;
  noiseArcs: number;
  backgroundColor: string;
  textColors: string[] | "random";
  noiseColors: string[] | "random";
  rotateRange: number;
  fontSizeVariation: number;
  positionVariation: number;
  textStroke: boolean;
  waveDistortion: boolean;
  fontFamilies: string[];
}

/**
 * 生成 SVG 验证码图片
 *
 * @param code - 验证码文本
 * @param options - 配置选项
 * @returns SVG 字符串
 */
function generateSvg(code: string, options: SvgOptions): string {
  const {
    width,
    height,
    noiseLines,
    noiseDots,
    noiseArcs,
    backgroundColor,
    textColors,
    noiseColors,
    rotateRange,
    fontSizeVariation,
    positionVariation,
    textStroke,
    waveDistortion,
    fontFamilies,
  } = options;

  // 获取背景颜色
  const bgColor = backgroundColor === "random"
    ? randomLightColor()
    : backgroundColor;

  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  // 定义滤镜（波浪扭曲效果）
  if (waveDistortion) {
    svg += `<defs>
      <filter id="wave">
        <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="turbulence"/>
        <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="3" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>`;
  }

  // 背景
  svg += `<rect width="100%" height="100%" fill="${bgColor}"/>`;

  // 背景噪点网格
  for (let i = 0; i < noiseDots; i++) {
    const cx = random(0, width);
    const cy = random(0, height);
    const r = random(0.5, 2.5);
    const color = getColorByType(noiseColors, "noise");
    const opacity = random(0.15, 0.4);
    svg +=
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
  }

  // 干扰圆弧
  for (let i = 0; i < noiseArcs; i++) {
    const cx = random(0, width);
    const cy = random(0, height);
    const r = random(10, 40);
    const startAngle = random(0, 360);
    const endAngle = startAngle + random(60, 180);
    const color = getColorByType(noiseColors, "noise");
    const strokeWidth = random(1, 2.5);
    const opacity = random(0.2, 0.5);

    // 计算圆弧路径
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    svg += `<path d="M${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2}"
            stroke="${color}" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}"/>`;
  }

  // 干扰线（贝塞尔曲线）
  for (let i = 0; i < noiseLines; i++) {
    const x1 = random(-10, width * 0.3);
    const y1 = random(0, height);
    const x2 = random(width * 0.7, width + 10);
    const y2 = random(0, height);
    const cx1 = random(width * 0.1, width * 0.5);
    const cy1 = random(-5, height + 5);
    const cx2 = random(width * 0.5, width * 0.9);
    const cy2 = random(-5, height + 5);
    const color = getColorByType(noiseColors, "noise");
    const strokeWidth = random(1, 2.5);
    const opacity = random(0.25, 0.55);

    svg += `<path d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}"
            stroke="${color}" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}"/>`;
  }

  // 文字组（可能应用波浪效果）
  const textGroupStyle = waveDistortion ? ' filter="url(#wave)"' : "";
  svg += `<g${textGroupStyle}>`;

  // 文字
  const charWidth = width / (code.length + 1);
  const baseFontSize = Math.min(height * 0.7, charWidth * 1.4);

  for (let i = 0; i < code.length; i++) {
    const x = charWidth * (i + 0.6) +
      random(-positionVariation, positionVariation);
    const y = height / 2 + baseFontSize / 3 +
      random(-positionVariation / 2, positionVariation / 2);
    const rotate = random(-rotateRange, rotateRange);
    const color = getColorByType(textColors, "text");
    const scale = 1 + random(-fontSizeVariation, fontSizeVariation);
    const fontSize = baseFontSize * scale;
    const font = fontFamilies[randomInt(0, fontFamilies.length - 1)];

    // 文字描边（增加辨识难度）
    if (textStroke) {
      const strokeColor = getColorByType(noiseColors, "noise");
      svg +=
        `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${font}, sans-serif"
              font-weight="bold" fill="none" stroke="${strokeColor}" stroke-width="2" opacity="0.3"
              transform="rotate(${rotate}, ${x}, ${y})">${code[i]}</text>`;
    }

    // 主文字
    svg +=
      `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${font}, sans-serif"
            font-weight="bold" fill="${color}"
            transform="rotate(${rotate}, ${x}, ${y})">${code[i]}</text>`;
  }

  svg += "</g>";

  // 前景干扰线（覆盖在文字上）
  for (let i = 0; i < Math.ceil(noiseLines / 2); i++) {
    const x1 = random(0, width);
    const y1 = random(0, height);
    const x2 = random(0, width);
    const y2 = random(0, height);
    const color = getColorByType(noiseColors, "noise");
    const strokeWidth = random(0.5, 1.5);
    const opacity = random(0.15, 0.35);

    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
  }

  svg += "</svg>";

  return svg;
}

/**
 * 图形验证码挑战类
 *
 * 生成 SVG 格式的图形验证码，包含多种干扰元素。
 *
 * @example
 * ```typescript
 * const challenge = new ImageChallenge({
 *   length: 6,
 *   noiseLines: 10,
 *   noiseArcs: 5,
 *   textColors: "random",
 * });
 *
 * const { data, answer } = challenge.generate();
 * const result = challenge.verify(answer, userInput);
 * ```
 */
export class ImageChallenge implements Challenge<ImageChallengeData, string> {
  /** 挑战类型 */
  readonly type = "image" as const;

  /** 配置选项 */
  private options: Required<ImageChallengeOptions>;

  /**
   * 创建图形验证码挑战实例
   *
   * @param options - 配置选项
   */
  constructor(options: ImageChallengeOptions = {}) {
    this.options = {
      length: options.length ?? 4,
      charset: options.charset ?? DEFAULT_CHARSET,
      width: options.width ?? 150,
      height: options.height ?? 50,
      noiseLines: options.noiseLines ?? 6,
      noiseDots: options.noiseDots ?? 80,
      noiseArcs: options.noiseArcs ?? 4,
      backgroundColor: options.backgroundColor ?? "#f5f5f5",
      textColors: options.textColors ?? DEFAULT_TEXT_COLORS,
      noiseColors: options.noiseColors ?? DEFAULT_NOISE_COLORS,
      caseSensitive: options.caseSensitive ?? false,
      rotateRange: options.rotateRange ?? 35,
      fontSizeVariation: options.fontSizeVariation ?? 0.2,
      positionVariation: options.positionVariation ?? 8,
      textStroke: options.textStroke ?? true,
      waveDistortion: options.waveDistortion ?? true,
      fontFamilies: options.fontFamilies ?? DEFAULT_FONTS,
    };
  }

  /**
   * 生成验证码
   *
   * @returns 验证码数据和答案
   */
  generate(): { data: ImageChallengeData; answer: string } {
    // 生成随机验证码文本
    const code = generateCode(this.options.length, this.options.charset);

    // 生成 SVG 图片
    const svg = generateSvg(code, {
      width: this.options.width,
      height: this.options.height,
      noiseLines: this.options.noiseLines,
      noiseDots: this.options.noiseDots,
      noiseArcs: this.options.noiseArcs,
      backgroundColor: this.options.backgroundColor,
      textColors: this.options.textColors,
      noiseColors: this.options.noiseColors,
      rotateRange: this.options.rotateRange,
      fontSizeVariation: this.options.fontSizeVariation,
      positionVariation: this.options.positionVariation,
      textStroke: this.options.textStroke,
      waveDistortion: this.options.waveDistortion,
      fontFamilies: this.options.fontFamilies,
    });

    // 转换为 Base64 Data URL（使用 UTF-8 安全编码）
    const base64 = encodeBase64(svg);
    const image = `data:image/svg+xml;base64,${base64}`;

    return {
      data: { image },
      answer: code,
    };
  }

  /**
   * 验证用户输入
   *
   * @param answer - 存储的正确答案
   * @param userInput - 用户输入的答案
   * @returns 验证结果
   */
  verify(answer: string, userInput: unknown): VerifyResult {
    // 检查输入类型
    if (typeof userInput !== "string") {
      return {
        success: false,
        error: "验证码格式错误",
      };
    }

    // 检查输入长度
    if (userInput.length !== answer.length) {
      return {
        success: false,
        error: "验证码错误",
      };
    }

    // 比较验证码
    const isValid = this.options.caseSensitive
      ? answer === userInput
      : answer.toLowerCase() === userInput.toLowerCase();

    if (isValid) {
      return { success: true };
    }

    return {
      success: false,
      error: "验证码错误",
    };
  }
}

/**
 * 创建图形验证码挑战实例
 *
 * @param options - 配置选项
 * @returns 图形验证码挑战实例
 *
 * @example
 * ```typescript
 * import { createImageChallenge } from "@dreamer/humancheck";
 *
 * // 基础用法
 * const challenge = createImageChallenge({ length: 4 });
 *
 * // 高安全性配置
 * const secureChallenge = createImageChallenge({
 *   length: 6,
 *   width: 200,
 *   height: 60,
 *   noiseLines: 12,
 *   noiseDots: 150,
 *   noiseArcs: 8,
 *   textColors: "random",
 *   noiseColors: "random",
 *   rotateRange: 45,
 *   waveDistortion: true,
 * });
 * ```
 */
export function createImageChallenge(
  options: ImageChallengeOptions = {},
): ImageChallenge {
  return new ImageChallenge(options);
}
