/**
 * @module @dreamer/humancheck
 *
 * 人机验证库，提供多种验证码和验证方式，用于防止机器人攻击。
 *
 * ## 功能特性
 *
 * - **图形验证码**：SVG 格式，支持自定义字符集、干扰线、颜色
 * - **数学验证码**：简单数学运算（加减乘）
 * - **滑块验证码**：拖动滑块到指定位置
 * - **TOTP 验证**：兼容 Google Authenticator 的两步验证
 * - **灵活存储**：支持内存、Redis、KV 等多种存储后端
 *
 * ## 快速开始
 *
 * @example 图形验证码
 * ```typescript
 * import { createHumanCheck, createImageChallenge } from "@dreamer/humancheck";
 *
 * // 创建验证器和挑战
 * const humanCheck = createHumanCheck();
 * const imageChallenge = createImageChallenge({ length: 4 });
 *
 * // 生成验证码
 * const { id, data } = await humanCheck.create(imageChallenge);
 * console.log(data.image); // Base64 SVG 图片
 *
 * // 验证用户输入
 * const result = await humanCheck.verify(id, userInput, imageChallenge);
 * if (result.success) {
 *   console.log("验证通过");
 * }
 * ```
 *
 * @example 数学验证码
 * ```typescript
 * import { createHumanCheck, createMathChallenge } from "@dreamer/humancheck";
 *
 * const humanCheck = createHumanCheck();
 * const mathChallenge = createMathChallenge({
 *   operators: ["+", "-"],
 *   maxNumber: 20,
 * });
 *
 * const { id, data } = await humanCheck.create(mathChallenge);
 * console.log(data.question); // "3 + 5 = ?"
 * ```
 *
 * @example TOTP 两步验证
 * ```typescript
 * import { createTotp } from "@dreamer/humancheck";
 *
 * const totp = createTotp({ issuer: "MyApp" });
 *
 * // 生成密钥（用户首次绑定）
 * const { secret, qrCode } = totp.generateSecret("user@example.com");
 *
 * // 验证用户输入
 * const result = await totp.verify(secret, "123456");
 * ```
 *
 * @example 滑块验证码
 * ```typescript
 * import { createHumanCheck, createSliderChallenge } from "@dreamer/humancheck";
 *
 * const humanCheck = createHumanCheck();
 * const sliderChallenge = createSliderChallenge({
 *   width: 300,
 *   tolerance: 5,
 * });
 *
 * const { id, data } = await humanCheck.create(sliderChallenge);
 * // data.background 是背景 SVG
 *
 * // 验证用户拖动位置
 * const result = await humanCheck.verify(id, { x: userX }, sliderChallenge);
 * ```
 */

// ============================================================================
// 核心验证器
// ============================================================================

export { createHumanCheck, HumanCheck } from "./core.ts";

// ============================================================================
// 验证码挑战
// ============================================================================

export {
  createImageChallenge,
  createMathChallenge,
  createSliderChallenge,
  ImageChallenge,
  MathChallenge,
  SliderChallenge,
} from "./challenges/mod.ts";

// ============================================================================
// OTP 一次性密码
// ============================================================================

export { createTotp, Totp } from "./otp/mod.ts";

// ============================================================================
// 存储适配器
// ============================================================================

export { createMemoryStore, MemoryStore } from "./stores/mod.ts";

// ============================================================================
// 第三方服务提供者（服务端验证）
// ============================================================================

export {
  createRecaptchaProvider,
  RecaptchaProvider,
} from "./providers/recaptcha.ts";
export {
  createTurnstileProvider,
  TurnstileProvider,
} from "./providers/turnstile.ts";

// ============================================================================
// 类型导出
// ============================================================================

export type {
  // 核心类型
  Challenge,
  ChallengeCreateResult,
  ChallengeRecord,
  ChallengeType,
  CreateOptions,
  // OTP
  EmailChallengeOptions,
  HumanCheckOptions,
  // 图形验证码
  ImageChallengeData,
  ImageChallengeOptions,
  // 数学验证码
  MathChallengeData,
  MathChallengeOptions,
  // 存储
  MemoryStoreOptions,
  OtpChallengeOptions,
  // 第三方服务
  Provider,
  ProviderConfig,
  RecaptchaConfig,
  // 滑块验证码
  SliderChallengeAnswer,
  SliderChallengeData,
  SliderChallengeOptions,
  SliderUserInput,
  SmsChallengeOptions,
  Store,
  // TOTP
  TotpOptions,
  TotpSecretResult,
  TurnstileConfig,
  VerifyOptions,
  VerifyResult,
} from "./types.ts";
