/**
 * @module @dreamer/humancheck/providers
 *
 * @fileoverview 第三方验证服务提供者
 *
 * 提供 Google reCAPTCHA、Cloudflare Turnstile 等第三方服务的服务端验证。
 *
 * @example reCAPTCHA 验证
 * ```typescript
 * import { createRecaptchaProvider } from "@dreamer/humancheck";
 *
 * const recaptcha = createRecaptchaProvider({
 *   secretKey: "your-secret-key",
 *   version: "v2",
 * });
 *
 * const result = await recaptcha.verify(token);
 * if (result.success) {
 *   console.log("验证通过！");
 * }
 * ```
 *
 * @example Turnstile 验证
 * ```typescript
 * import { createTurnstileProvider } from "@dreamer/humancheck";
 *
 * const turnstile = createTurnstileProvider({
 *   secretKey: "your-secret-key",
 * });
 *
 * const result = await turnstile.verify(token);
 * ```
 */

export { createRecaptchaProvider, RecaptchaProvider } from "./recaptcha.ts";
export { createTurnstileProvider, TurnstileProvider } from "./turnstile.ts";
