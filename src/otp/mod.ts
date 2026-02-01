/**
 * @module @dreamer/humancheck/otp
 *
 * @fileoverview OTP（一次性密码）模块
 *
 * 提供多种一次性密码实现：
 * - TOTP: 基于时间的一次性密码（Google Authenticator 兼容）
 *
 * @example
 * ```typescript
 * import { createTotp } from "@dreamer/humancheck";
 *
 * const totp = createTotp({ issuer: "MyApp" });
 * const { secret, qrCode } = totp.generateSecret("user@example.com");
 * ```
 */

// TOTP
export { createTotp, Totp } from "./totp.ts";
