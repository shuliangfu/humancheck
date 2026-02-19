/**
 * @module @dreamer/humancheck/providers/turnstile
 *
 * @fileoverview Cloudflare Turnstile 服务端验证
 *
 * 提供 Turnstile token 的服务端验证功能。
 *
 * @example
 * ```typescript
 * import { createTurnstileProvider } from "@dreamer/humancheck";
 *
 * const turnstile = createTurnstileProvider({
 *   secretKey: "your-secret-key",
 * });
 *
 * // 验证客户端提交的 token
 * const result = await turnstile.verify(token, {
 *   remoteip: clientIp, // 可选
 * });
 *
 * if (result.success) {
 *   console.log("验证通过！");
 * } else {
 *   console.log("验证失败:", result.errorCodes);
 * }
 * ```
 */

import { $tr } from "../i18n.ts";
import type { TurnstileConfig, VerifyResult } from "../types.ts";

/** Turnstile siteverify API URL */
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Turnstile 验证选项
 */
export interface TurnstileVerifyOptions {
  /** 用户 IP 地址（可选，用于增强安全性） */
  remoteip?: string;
  /** 幂等键（可选，用于防重复提交） */
  idempotencyKey?: string;
}

/**
 * Turnstile 验证响应
 */
export interface TurnstileVerifyResponse {
  /** 是否验证成功 */
  success: boolean;
  /** 挑战时间戳 */
  challenge_ts?: string;
  /** 主机名 */
  hostname?: string;
  /** 错误代码列表 */
  "error-codes"?: string[];
  /** 动作（如配置） */
  action?: string;
  /** CData（如配置） */
  cdata?: string;
}

/**
 * Turnstile 服务端验证提供者
 *
 * 用于在服务端验证 Turnstile token。
 *
 * @example
 * ```typescript
 * const provider = new TurnstileProvider({
 *   secretKey: "your-secret-key",
 * });
 *
 * const result = await provider.verify(token);
 * ```
 */
export class TurnstileProvider {
  /** 配置 */
  private config: TurnstileConfig;

  /**
   * 创建 Turnstile 验证提供者
   *
   * @param config - 配置选项
   */
  constructor(config: TurnstileConfig) {
    if (!config.secretKey) {
      throw new Error($tr("humancheck.turnstile.secretKeyRequired"));
    }
    this.config = config;
  }

  /**
   * 验证 Turnstile token
   *
   * @param token - 客户端提交的 token
   * @param options - 验证选项
   * @returns 验证结果
   *
   * @example
   * ```typescript
   * const result = await provider.verify(token, {
   *   remoteip: "192.168.1.1",
   * });
   *
   * if (result.success) {
   *   // 验证通过
   * }
   * ```
   */
  async verify(
    token: string,
    options?: TurnstileVerifyOptions,
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

      if (options?.idempotencyKey) {
        formData.append("idempotency_key", options.idempotencyKey);
      }

      // 发送验证请求
      const response = await fetch(TURNSTILE_VERIFY_URL, {
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

      const data: TurnstileVerifyResponse = await response.json();

      if (data.success) {
        return {
          success: true,
          data: {
            challengeTs: data.challenge_ts,
            hostname: data.hostname,
            action: data.action,
            cdata: data.cdata,
          },
        };
      } else {
        return {
          success: false,
          error: "Turnstile 验证失败",
          errorCodes: data["error-codes"],
        };
      }
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
}

/**
 * 创建 Turnstile 验证提供者
 *
 * @param config - 配置选项
 * @returns Turnstile 验证提供者
 *
 * @example
 * ```typescript
 * import { createTurnstileProvider } from "@dreamer/humancheck";
 *
 * const turnstile = createTurnstileProvider({
 *   siteKey: "your-site-key",
 *   secretKey: "your-secret-key",
 * });
 *
 * // 在 API 路由中验证
 * app.post("/api/verify", async (req) => {
 *   const { token } = await req.json();
 *   const result = await turnstile.verify(token, {
 *     remoteip: req.headers.get("x-forwarded-for"),
 *   });
 *   return Response.json(result);
 * });
 * ```
 */
export function createTurnstileProvider(
  config: TurnstileConfig,
): TurnstileProvider {
  return new TurnstileProvider(config);
}
