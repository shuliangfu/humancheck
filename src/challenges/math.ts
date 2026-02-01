/**
 * @module @dreamer/humancheck/challenges/math
 *
 * @fileoverview 数学验证码
 *
 * 生成数学运算验证码，支持多种干扰元素：
 * - 加法、减法、乘法运算
 * - 可配置数值范围
 * - 多种干扰元素（线条、圆弧、点）
 * - 字符独立渲染和旋转
 * - 随机颜色
 *
 * @example
 * ```typescript
 * import { createMathChallenge } from "@dreamer/humancheck";
 *
 * const challenge = createMathChallenge({
 *   operators: ["+", "-", "*"],
 *   maxNumber: 20,
 *   asImage: true,
 *   imageOptions: {
 *     noiseLines: 8,
 *     textColors: "random",
 *   },
 * });
 *
 * const { data, answer } = challenge.generate();
 * ```
 */

import type {
  Challenge,
  ImageChallengeOptions,
  MathChallengeData,
  MathChallengeOptions,
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
 * 运算符类型
 */
type Operator = "+" | "-" | "*";

/**
 * 运算符显示符号映射（用于图片显示）
 */
const OPERATOR_DISPLAY: Record<Operator, string> = {
  "+": "+",
  "-": "-",
  "*": "×",
};

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
];

/**
 * 默认字体列表
 */
const DEFAULT_FONTS = [
  "Arial",
  "Helvetica",
  "Verdana",
  "Georgia",
];

/**
 * 生成随机深色
 *
 * @returns HEX 颜色
 */
function randomDarkColor(): string {
  return randomColor({ saturation: [50, 80], lightness: [25, 45] });
}

/**
 * 生成随机浅色
 *
 * @returns HEX 颜色
 */
function randomLightColor(): string {
  return randomColor({ saturation: [10, 30], lightness: [90, 98] });
}

/**
 * 生成随机中等颜色
 *
 * @returns HEX 颜色
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
 * 计算结果
 *
 * @param a - 第一个操作数
 * @param b - 第二个操作数
 * @param operator - 运算符
 * @returns 计算结果
 */
function calculate(a: number, b: number, operator: Operator): number {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    default:
      return a + b;
  }
}

/**
 * 图片选项的内部类型
 */
interface InternalImageOptions {
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
 * 生成数学表达式 SVG 图片
 *
 * @param question - 数学表达式
 * @param options - 图片配置
 * @returns SVG 字符串
 */
function generateSvg(question: string, options: InternalImageOptions): string {
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
        <feTurbulence type="turbulence" baseFrequency="0.015" numOctaves="2" result="turbulence"/>
        <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="2" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </defs>`;
  }

  // 背景
  svg += `<rect width="100%" height="100%" fill="${bgColor}"/>`;

  // 背景噪点
  for (let i = 0; i < noiseDots; i++) {
    const cx = random(0, width);
    const cy = random(0, height);
    const r = random(0.5, 2);
    const color = getColorByType(noiseColors, "noise");
    const opacity = random(0.15, 0.35);
    svg +=
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
  }

  // 干扰圆弧
  for (let i = 0; i < noiseArcs; i++) {
    const cx = random(0, width);
    const cy = random(0, height);
    const r = random(8, 30);
    const startAngle = random(0, 360);
    const endAngle = startAngle + random(60, 150);
    const color = getColorByType(noiseColors, "noise");
    const strokeWidth = random(0.8, 2);
    const opacity = random(0.2, 0.45);

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
    const x1 = random(-5, width * 0.3);
    const y1 = random(0, height);
    const x2 = random(width * 0.7, width + 5);
    const y2 = random(0, height);
    const cx1 = random(width * 0.1, width * 0.5);
    const cy1 = random(-3, height + 3);
    const cx2 = random(width * 0.5, width * 0.9);
    const cy2 = random(-3, height + 3);
    const color = getColorByType(noiseColors, "noise");
    const strokeWidth = random(0.8, 2);
    const opacity = random(0.2, 0.45);

    svg += `<path d="M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}"
            stroke="${color}" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}"/>`;
  }

  // 文字组
  const textGroupStyle = waveDistortion ? ' filter="url(#wave)"' : "";
  svg += `<g${textGroupStyle}>`;

  // 将问题拆分为字符单独渲染
  const chars = question.split("");
  const totalChars = chars.length;
  const charWidth = width / (totalChars + 0.5);
  const baseFontSize = Math.min(height * 0.6, charWidth * 1.3);

  for (let i = 0; i < totalChars; i++) {
    const char = chars[i];
    const x = charWidth * (i + 0.4) +
      random(-positionVariation, positionVariation);
    const y = height / 2 + baseFontSize / 3 +
      random(-positionVariation / 2, positionVariation / 2);
    const rotate = random(-rotateRange, rotateRange);
    const color = getColorByType(textColors, "text");
    const scale = 1 + random(-fontSizeVariation, fontSizeVariation);
    const fontSize = baseFontSize * scale;
    const font = fontFamilies[randomInt(0, fontFamilies.length - 1)];

    // 跳过空格的旋转
    const actualRotate = char === " " ? 0 : rotate;

    // 文字描边
    if (textStroke && char !== " ") {
      const strokeColor = getColorByType(noiseColors, "noise");
      svg +=
        `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${font}, sans-serif"
              font-weight="bold" fill="none" stroke="${strokeColor}" stroke-width="1.5" opacity="0.25"
              transform="rotate(${actualRotate}, ${x}, ${y})">${char}</text>`;
    }

    // 主文字
    svg +=
      `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${font}, sans-serif"
            font-weight="bold" fill="${color}"
            transform="rotate(${actualRotate}, ${x}, ${y})">${char}</text>`;
  }

  svg += "</g>";

  // 前景干扰线
  for (let i = 0; i < Math.ceil(noiseLines / 3); i++) {
    const x1 = random(0, width);
    const y1 = random(0, height);
    const x2 = random(0, width);
    const y2 = random(0, height);
    const color = getColorByType(noiseColors, "noise");
    const strokeWidth = random(0.5, 1.2);
    const opacity = random(0.1, 0.3);

    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
  }

  svg += "</svg>";

  return svg;
}

/**
 * 合并图片选项
 *
 * @param userOptions - 用户配置
 * @returns 完整配置
 */
function mergeImageOptions(
  userOptions?: Omit<
    ImageChallengeOptions,
    "length" | "charset" | "caseSensitive"
  >,
): InternalImageOptions {
  return {
    width: userOptions?.width ?? 180,
    height: userOptions?.height ?? 55,
    noiseLines: userOptions?.noiseLines ?? 5,
    noiseDots: userOptions?.noiseDots ?? 60,
    noiseArcs: userOptions?.noiseArcs ?? 3,
    backgroundColor: userOptions?.backgroundColor ?? "#f5f5f5",
    textColors: userOptions?.textColors ?? ["#1a1a1a", "#0055aa", "#005533"],
    noiseColors: userOptions?.noiseColors ?? DEFAULT_NOISE_COLORS,
    rotateRange: userOptions?.rotateRange ?? 20,
    fontSizeVariation: userOptions?.fontSizeVariation ?? 0.15,
    positionVariation: userOptions?.positionVariation ?? 5,
    textStroke: userOptions?.textStroke ?? true,
    waveDistortion: userOptions?.waveDistortion ?? true,
    fontFamilies: userOptions?.fontFamilies ?? DEFAULT_FONTS,
  };
}

/**
 * 数学验证码挑战类
 *
 * 生成数学运算验证码，支持多种干扰元素。
 *
 * @example
 * ```typescript
 * const challenge = new MathChallenge({
 *   operators: ["add", "subtract", "multiply"],
 *   maxNumber: 10,
 *   asImage: true,
 *   imageOptions: {
 *     noiseLines: 8,
 *     textColors: "random",
 *   },
 * });
 *
 * const { data, answer } = challenge.generate();
 * const result = challenge.verify(answer, userInput);
 * ```
 */
export class MathChallenge implements Challenge<MathChallengeData, number> {
  /** 挑战类型 */
  readonly type = "math" as const;

  /** 配置选项 */
  private options: Required<MathChallengeOptions>;

  /**
   * 创建数学验证码挑战实例
   *
   * @param options - 配置选项
   */
  constructor(options: MathChallengeOptions = {}) {
    this.options = {
      operators: options.operators ?? ["+", "-"],
      minNumber: options.minNumber ?? 1,
      maxNumber: options.maxNumber ?? 20,
      asImage: options.asImage ?? true,
      imageOptions: options.imageOptions ?? {},
    };
  }

  /**
   * 生成验证码
   *
   * @returns 验证码数据和答案
   */
  generate(): { data: MathChallengeData; answer: number } {
    // 随机选择运算符
    const operatorIndex = Math.floor(
      Math.random() * this.options.operators.length,
    );
    const operator = this.options.operators[operatorIndex];

    // 生成两个随机数
    let a = randomInt(this.options.minNumber, this.options.maxNumber);
    let b = randomInt(this.options.minNumber, this.options.maxNumber);

    // 确保减法结果为正数
    if (operator === "-" && a < b) {
      [a, b] = [b, a];
    }

    // 计算结果
    const answer = calculate(a, b, operator);

    // 生成表达式（显示符号，如 × 代替 *）
    const symbol = OPERATOR_DISPLAY[operator];
    const question = `${a} ${symbol} ${b} = ?`;

    // 构造返回数据
    const data: MathChallengeData = { question };

    // 生成图片
    if (this.options.asImage) {
      const imageOptions = mergeImageOptions(this.options.imageOptions);
      const svg = generateSvg(question, imageOptions);
      const base64 = encodeBase64(svg);
      data.image = `data:image/svg+xml;base64,${base64}`;
    }

    return { data, answer };
  }

  /**
   * 验证用户输入
   *
   * @param answer - 存储的正确答案
   * @param userInput - 用户输入的答案
   * @returns 验证结果
   */
  verify(answer: number, userInput: unknown): VerifyResult {
    // 转换用户输入为数字
    let inputNumber: number;

    if (typeof userInput === "number") {
      inputNumber = userInput;
    } else if (typeof userInput === "string") {
      inputNumber = parseInt(userInput, 10);
      if (isNaN(inputNumber)) {
        return {
          success: false,
          error: "请输入有效的数字",
        };
      }
    } else {
      return {
        success: false,
        error: "答案格式错误",
      };
    }

    // 比较答案
    if (inputNumber === answer) {
      return { success: true };
    }

    return {
      success: false,
      error: "计算结果错误",
    };
  }
}

/**
 * 创建数学验证码挑战实例
 *
 * @param options - 配置选项
 * @returns 数学验证码挑战实例
 *
 * @example
 * ```typescript
 * import { createMathChallenge } from "@dreamer/humancheck";
 *
 * // 基础用法
 * const challenge = createMathChallenge();
 *
 * // 高安全性配置
 * const secureChallenge = createMathChallenge({
 *   operators: ["+", "-", "*"],
 *   maxNumber: 30,
 *   asImage: true,
 *   imageOptions: {
 *     width: 200,
 *     height: 60,
 *     noiseLines: 10,
 *     noiseArcs: 6,
 *     textColors: "random",
 *     noiseColors: "random",
 *   },
 * });
 * ```
 */
export function createMathChallenge(
  options: MathChallengeOptions = {},
): MathChallenge {
  return new MathChallenge(options);
}
