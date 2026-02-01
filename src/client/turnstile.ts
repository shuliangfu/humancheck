/**
 * @module @dreamer/humancheck/client/turnstile
 *
 * @fileoverview Cloudflare Turnstile 客户端封装
 *
 * 提供 Turnstile 的客户端集成，支持：
 * - 自动加载脚本
 * - 自动服务端验证
 * - 简化 API
 *
 * @example 基础用法（自动验证）
 * ```typescript
 * import { createTurnstileClient } from "@dreamer/humancheck/client/turnstile";
 *
 * const turnstile = createTurnstileClient({
 *   siteKey: "your-site-key",
 *   verifyUrl: "/api/humancheck/verify",
 *   onVerified: (result) => console.log("验证通过！", result),
 *   onError: (error) => console.log("验证失败:", error),
 * });
 *
 * await turnstile.load();
 * turnstile.render("#captcha-container");
 * ```
 */

import type {
  ThirdPartyVerifyResult,
  TurnstileClientOptions,
  TurnstileGlobal,
  TurnstileRenderParams,
} from "./types.ts";

/** Turnstile 脚本 URL */
const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

/** 脚本加载状态 */
let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

/**
 * 获取 turnstile 全局对象
 *
 * @returns turnstile 对象或 undefined
 */
function getTurnstile(): TurnstileGlobal | undefined {
  return (globalThis as unknown as { turnstile?: TurnstileGlobal }).turnstile;
}

/**
 * Turnstile 客户端类
 *
 * 封装 Cloudflare Turnstile 的加载、渲染和验证操作。
 *
 * @example
 * ```typescript
 * const client = new TurnstileClient({
 *   siteKey: "your-site-key",
 *   verifyUrl: "/api/verify",
 *   onVerified: (result) => console.log("验证成功！"),
 * });
 *
 * await client.load();
 * client.render("#container");
 * // 用户完成验证后自动发送请求到服务端验证
 * ```
 */
export class TurnstileClient {
  /** 配置选项 */
  private options:
    & Required<
      Pick<
        TurnstileClientOptions,
        "theme" | "size" | "language" | "appearance" | "retry" | "retryInterval"
      >
    >
    & TurnstileClientOptions;

  /** Widget ID */
  private widgetId: string | null = null;

  /** 是否正在验证 */
  private isVerifying = false;

  /**
   * 创建 Turnstile 客户端实例
   *
   * @param options - 配置选项
   */
  constructor(options: TurnstileClientOptions) {
    this.options = {
      ...options,
      theme: options.theme ?? "auto",
      size: options.size ?? "normal",
      language: options.language ?? "",
      appearance: options.appearance ?? "always",
      retry: options.retry ?? "auto",
      retryInterval: options.retryInterval ?? 8000,
    };
  }

  /**
   * 加载 Turnstile 脚本
   *
   * @returns Promise，脚本加载完成后解析
   */
  load(): Promise<void> {
    // 如果已加载，直接返回
    if (scriptLoaded && getTurnstile()) {
      return Promise.resolve();
    }

    // 如果正在加载，等待加载完成
    if (scriptLoading) {
      return scriptLoading;
    }

    // 开始加载脚本
    scriptLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        scriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        scriptLoading = null;
        reject(new Error("Turnstile 脚本加载失败"));
      };

      document.head.appendChild(script);
    });

    return scriptLoading;
  }

  /**
   * 渲染 Turnstile 组件
   *
   * @param container - 容器元素或选择器
   * @returns Widget ID
   */
  render(container: HTMLElement | string): string {
    const turnstile = getTurnstile();
    if (!turnstile) {
      throw new Error("Turnstile 脚本未加载，请先调用 load()");
    }

    // 解析容器
    const containerEl = typeof container === "string"
      ? document.querySelector(container)
      : container;

    if (!containerEl) {
      throw new Error("容器元素不存在");
    }

    // 渲染参数
    const params: TurnstileRenderParams = {
      sitekey: this.options.siteKey,
      theme: this.options.theme,
      size: this.options.size,
      language: this.options.language || undefined,
      appearance: this.options.appearance,
      retry: this.options.retry,
      "retry-interval": this.options.retryInterval,
      callback: (token: string) => {
        this.options.onSuccess?.(token);
        // 自动验证
        if (this.options.verifyUrl) {
          this.verifyToken(token);
        }
      },
      "expired-callback": () => {
        this.options.onExpire?.();
      },
      "error-callback": (error: string) => {
        this.options.onError?.(new Error(error));
      },
    };

    // 渲染
    this.widgetId = turnstile.render(containerEl as HTMLElement, params);
    return this.widgetId;
  }

  /**
   * 发送 token 到服务端验证
   *
   * @param token - Turnstile token
   * @returns 验证结果
   */
  async verifyToken(token: string): Promise<ThirdPartyVerifyResult> {
    if (!this.options.verifyUrl) {
      return { success: false, error: "未设置 verifyUrl" };
    }

    if (this.isVerifying) {
      return { success: false, error: "正在验证中" };
    }

    this.isVerifying = true;

    try {
      const response = await fetch(this.options.verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.options.headers,
        },
        body: JSON.stringify({
          token,
          provider: "turnstile",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ThirdPartyVerifyResult = await response.json();

      if (result.success) {
        this.options.onVerified?.(result);
      } else {
        this.options.onError?.(new Error(result.error || "验证失败"));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "网络错误";
      this.options.onError?.(new Error(errorMessage));
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.isVerifying = false;
    }
  }

  /**
   * 执行验证（手动触发）
   *
   * @param container - 容器元素或选择器（可选）
   */
  execute(container?: HTMLElement | string): void {
    const turnstile = getTurnstile();
    if (!turnstile) {
      throw new Error("Turnstile 脚本未加载，请先调用 load()");
    }

    turnstile.execute(container, undefined);
  }

  /**
   * 获取验证响应
   *
   * @returns 验证令牌，如果未验证则返回 undefined
   */
  getResponse(): string | undefined {
    const turnstile = getTurnstile();
    if (!turnstile) {
      return undefined;
    }

    return turnstile.getResponse(this.widgetId ?? undefined);
  }

  /**
   * 重置 Turnstile
   */
  reset(): void {
    const turnstile = getTurnstile();
    if (!turnstile) {
      return;
    }

    turnstile.reset(this.widgetId ?? undefined);
  }

  /**
   * 移除 Turnstile
   */
  remove(): void {
    const turnstile = getTurnstile();
    if (!turnstile) {
      return;
    }

    turnstile.remove(this.widgetId ?? undefined);
    this.widgetId = null;
  }

  /**
   * 获取脚本 URL
   *
   * @returns 脚本 URL
   */
  getScriptUrl(): string {
    return TURNSTILE_SCRIPT_URL;
  }
}

/**
 * 创建 Turnstile 客户端实例
 *
 * @param options - 配置选项
 * @returns Turnstile 客户端实例
 *
 * @example 自动验证（推荐）
 * ```typescript
 * import { createTurnstileClient } from "@dreamer/humancheck/client/turnstile";
 *
 * const turnstile = createTurnstileClient({
 *   siteKey: "your-site-key",
 *   verifyUrl: "/api/humancheck/verify",
 *   onVerified: (result) => {
 *     console.log("服务端验证通过！");
 *     // 继续业务逻辑
 *   },
 *   onError: (error) => {
 *     console.log("验证失败:", error);
 *   },
 * });
 *
 * await turnstile.load();
 * turnstile.render("#container");
 * ```
 *
 * @example 手动验证（不设置 verifyUrl）
 * ```typescript
 * const turnstile = createTurnstileClient({
 *   siteKey: "your-site-key",
 *   // 不设置 verifyUrl，手动处理 token
 *   onSuccess: (token) => {
 *     console.log("获取到 token:", token);
 *     // 手动发送到服务端
 *   },
 * });
 *
 * await turnstile.load();
 * turnstile.render("#container");
 * ```
 */
export function createTurnstileClient(
  options: TurnstileClientOptions,
): TurnstileClient {
  return new TurnstileClient(options);
}
