/**
 * @module @dreamer/humancheck/providers/recaptcha
 *
 * @fileoverview Google reCAPTCHA 服务端验证
 *
 * 提供 reCAPTCHA v2 和 v3 token 的服务端验证功能。
 *
 * @example reCAPTCHA v2
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
 * @example reCAPTCHA v3
 * ```typescript
 * const recaptcha = createRecaptchaProvider({
 *   secretKey: "your-secret-key",
 *   version: "v3",
 *   minScore: 0.5, // 最低分数阈值
 * });
 *
 * const result = await recaptcha.verify(token, {
 *   action: "login", // 预期动作
 * });
 *
 * if (result.success) {
 *   console.log("分数:", result.data?.score);
 * }
 * ```
 */

import { $tr } from "../i18n.ts";
import type { RecaptchaConfig, VerifyResult } from "../types.ts";

/** reCAPTCHA siteverify API URL */
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * reCAPTCHA 验证选项
 */
export interface RecaptchaVerifyOptions {
  /** 用户 IP 地址（可选，用于增强安全性） */
  remoteip?: string;
  /** 预期动作（v3 专用） */
  action?: string;
}

/**
 * reCAPTCHA 验证响应
 */
export interface RecaptchaVerifyResponse {
  /** 是否验证成功 */
  success: boolean;
  /** 挑战时间戳 */
  challenge_ts?: string;
  /** 主机名 */
  hostname?: string;
  /** 错误代码列表 */
  "error-codes"?: string[];
  /** 分数（v3 专用，0.0-1.0） */
  score?: number;
  /** 动作（v3 专用） */
  action?: string;
}

/**
 * reCAPTCHA 服务端验证提供者
 *
 * 用于在服务端验证 reCAPTCHA token。
 *
 * @example
 * ```typescript
 * const provider = new RecaptchaProvider({
 *   secretKey: "your-secret-key",
 *   version: "v2",
 * });
 *
 * const result = await provider.verify(token);
 * ```
 */
export class RecaptchaProvider {
  /** 配置 */
  private config: RecaptchaConfig & { version: "v2" | "v3"; minScore: number };

  /**
   * 创建 reCAPTCHA 验证提供者
   *
   * @param config - 配置选项
   */
  constructor(config: RecaptchaConfig) {
    if (!config.secretKey) {
      throw new Error($tr("humancheck.recaptcha.secretKeyRequired"));
    }
    this.config = {
      ...config,
      version: config.version ?? "v2",
      minScore: config.minScore ?? 0.5,
    };
  }

  /**
   * 验证 reCAPTCHA token
   *
   * @param token - 客户端提交的 token
   * @param options - 验证选项
   * @returns 验证结果
   *
   * @example
   * ```typescript
   * // v2 验证
   * const result = await provider.verify(token);
   *
   * // v3 验证（带动作）
   * const result = await provider.verify(token, {
   *   action: "login",
   * });
   *
   * if (result.success) {
   *   console.log("分数:", result.data?.score);
   * }
   * ```
   */
  async verify(
    token: string,
    options?: RecaptchaVerifyOptions,
  ): Promise<VerifyResult & { errorCodes?: string[] }> {
    if (!token) {
      return {
        success: false,
        error: "token 不能为空",
      };
    }

    try {
      // 构建请求参数
      const formData = new URLSearchParams();
      formData.append("secret", this.config.secretKey);
      formData.append("response", token);

      if (options?.remoteip) {
        formData.append("remoteip", options.remoteip);
      }

      // 发送验证请求
      const response = await fetch(RECAPTCHA_VERIFY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data: RecaptchaVerifyResponse = await response.json();

      // 基本验证失败
      if (!data.success) {
        return {
          success: false,
          error: "reCAPTCHA 验证失败",
          errorCodes: data["error-codes"],
        };
      }

      // v3 额外验证
      if (this.config.version === "v3") {
        // 检查分数
        if (data.score !== undefined && data.score < this.config.minScore) {
          return {
            success: false,
            error: `分数过低: ${data.score} < ${this.config.minScore}`,
            data: {
              score: data.score,
              action: data.action,
            },
          };
        }

        // 检查动作
        if (
          options?.action &&
          this.config.action &&
          data.action !== this.config.action
        ) {
          return {
            success: false,
            error: `动作不匹配: ${data.action} !== ${this.config.action}`,
            data: {
              score: data.score,
              action: data.action,
            },
          };
        }
      }

      return {
        success: true,
        data: {
          challengeTs: data.challenge_ts,
          hostname: data.hostname,
          score: data.score,
          action: data.action,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "验证请求失败",
      };
    }
  }

  /**
   * 获取站点密钥（用于客户端）
   *
   * @returns 站点密钥
   */
  getSiteKey(): string {
    return this.config.siteKey;
  }

  /**
   * 获取版本
   *
   * @returns reCAPTCHA 版本
   */
  getVersion(): "v2" | "v3" {
    return this.config.version;
  }
}

/**
 * 创建 reCAPTCHA 验证提供者
 *
 * @param config - 配置选项
 * @returns reCAPTCHA 验证提供者
 *
 * @example reCAPTCHA v2
 * ```typescript
 * import { createRecaptchaProvider } from "@dreamer/humancheck";
 *
 * const recaptcha = createRecaptchaProvider({
 *   siteKey: "your-site-key",
 *   secretKey: "your-secret-key",
 *   version: "v2",
 * });
 *
 * // 在 API 路由中验证
 * app.post("/api/verify", async (req) => {
 *   const { token } = await req.json();
 *   const result = await recaptcha.verify(token);
 *   return Response.json(result);
 * });
 * ```
 *
 * @example reCAPTCHA v3
 * ```typescript
 * const recaptcha = createRecaptchaProvider({
 *   siteKey: "your-site-key",
 *   secretKey: "your-secret-key",
 *   version: "v3",
 *   minScore: 0.5,
 * });
 *
 * // 验证登录请求
 * app.post("/api/login", async (req) => {
 *   const { token, ...credentials } = await req.json();
 *
 *   const result = await recaptcha.verify(token, {
 *     action: "login",
 *   });
 *
 *   if (!result.success) {
 *     return Response.json({ error: "验证失败" }, { status: 403 });
 *   }
 *
 *   // 继续登录逻辑...
 * });
 * ```
 */
export function createRecaptchaProvider(
  config: RecaptchaConfig,
): RecaptchaProvider {
  return new RecaptchaProvider(config);
}
