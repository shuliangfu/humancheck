/**
 * @module @dreamer/humancheck/challenges
 *
 * @fileoverview 验证码挑战模块
 *
 * 提供多种验证码类型：
 * - ImageChallenge: 图形验证码
 * - MathChallenge: 数学验证码
 * - SliderChallenge: 滑块验证码
 *
 * @example
 * ```typescript
 * import {
 *   createImageChallenge,
 *   createMathChallenge,
 *   createSliderChallenge,
 * } from "@dreamer/humancheck";
 *
 * const imageChallenge = createImageChallenge({ length: 4 });
 * const mathChallenge = createMathChallenge({ maxNumber: 20 });
 * const sliderChallenge = createSliderChallenge({ width: 300 });
 * ```
 */

// 图形验证码
export { createImageChallenge, ImageChallenge } from "./image.ts";

// 数学验证码
export { createMathChallenge, MathChallenge } from "./math.ts";

// 滑块验证码
export { createSliderChallenge, SliderChallenge } from "./slider.ts";
