/**
 * @module @dreamer/humancheck/client/recaptcha
 *
 * @fileoverview Google reCAPTCHA 客户端封装
 *
 * 提供 reCAPTCHA v2 和 v3 的客户端集成，支持：
 * - 自动加载脚本
 * - 自动服务端验证
 * - 简化 API
 *
 * @example 基础用法（自动验证）
 * ```typescript
 * import { createRecaptchaClient } from "@dreamer/humancheck/client/recaptcha";
 *
 * const recaptcha = createRecaptchaClient({
 *   siteKey: "your-site-key",
 *   verifyUrl: "/api/humancheck/verify",
 *   onVerified: (result) => console.log("验证通过！", result),
 *   onError: (error) => console.log("验证失败:", error),
 * });
 *
 * await recaptcha.load();
 * recaptcha.render("#captcha-container");
 * ```
 */

import type {
  RecaptchaClientOptions,
  RecaptchaGlobal,
  RecaptchaRenderParams,
  ThirdPartyVerifyResult,
} from "./types.ts";

/** reCAPTCHA 脚本基础 URL */
const RECAPTCHA_SCRIPT_URL = "https://www.google.com/recaptcha/api.js";

/** 脚本加载状态 */
let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

/**
 * 获取 grecaptcha 全局对象
 *
 * @returns grecaptcha 对象或 undefined
 */
function getGrecaptcha(): RecaptchaGlobal | undefined {
  return (globalThis as unknown as { grecaptcha?: RecaptchaGlobal }).grecaptcha;
}

/**
 * reCAPTCHA 客户端类
 *
 * 封装 reCAPTCHA v2/v3 的加载、渲染和验证操作。
 *
 * @example
 * ```typescript
 * const client = new RecaptchaClient({
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
export class RecaptchaClient {
  /** 配置选项 */
  private options:
    & Required<
      Pick<RecaptchaClientOptions, "version" | "theme" | "size" | "action" | "hl">
    >
    & RecaptchaClientOptions;

  /** Widget ID（v2） */
  private widgetId: number | null = null;

  /** 是否正在验证 */
  private isVerifying = false;

  /**
   * 创建 reCAPTCHA 客户端实例
   *
   * @param options - 配置选项
   */
  constructor(options: RecaptchaClientOptions) {
    this.options = {
      ...options,
      version: options.version ?? "v2",
      theme: options.theme ?? "light",
      size: options.size ?? "normal",
      action: options.action ?? "submit",
      hl: options.hl ?? "",
    };
  }

  /**
   * 加载 reCAPTCHA 脚本
   *
   * @returns Promise，脚本加载完成后解析
   */
  load(): Promise<void> {
    // 如果已加载，直接返回
    if (scriptLoaded && getGrecaptcha()) {
      return Promise.resolve();
    }

    // 如果正在加载，等待加载完成
    if (scriptLoading) {
      return scriptLoading;
    }

    // 开始加载脚本
    scriptLoading = new Promise((resolve, reject) => {
      // 构建脚本 URL
      let url = RECAPTCHA_SCRIPT_URL;
      const params: string[] = [];

      // v3 需要传入 siteKey
      if (this.options.version === "v3") {
        params.push(`render=${this.options.siteKey}`);
      } else {
        params.push("render=explicit");
      }

      // 语言
      if (this.options.hl) {
        params.push(`hl=${this.options.hl}`);
      }

      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      // 创建 script 标签
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        scriptLoaded = true;
        const grecaptcha = getGrecaptcha();

        // v3 需要等待 ready
        if (this.options.version === "v3" && grecaptcha) {
          grecaptcha.ready(() => {
            resolve();
          });
        } else {
          resolve();
        }
      };

      script.onerror = () => {
        scriptLoading = null;
        reject(new Error("reCAPTCHA 脚本加载失败"));
      };

      document.head.appendChild(script);
    });

    return scriptLoading;
  }

  /**
   * 渲染 reCAPTCHA 组件（v2）
   *
   * @param container - 容器元素或选择器
   * @returns Widget ID
   */
  render(container: HTMLElement | string): number {
    if (this.options.version !== "v2") {
      throw new Error("render() 仅适用于 reCAPTCHA v2");
    }

    const grecaptcha = getGrecaptcha();
    if (!grecaptcha) {
      throw new Error("reCAPTCHA 脚本未加载，请先调用 load()");
    }

    // 解析容器
    const containerEl = typeof container === "string"
      ? document.querySelector(container)
      : container;

    if (!containerEl) {
      throw new Error("容器元素不存在");
    }

    // 渲染参数
    const params: RecaptchaRenderParams = {
      sitekey: this.options.siteKey,
      theme: this.options.theme,
      size: this.options.size,
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
      "error-callback": () => {
        this.options.onError?.(new Error("reCAPTCHA 验证错误"));
      },
    };

    // 渲染
    this.widgetId = grecaptcha.render(containerEl as HTMLElement, params);
    return this.widgetId;
  }

  /**
   * 执行验证（v3）或获取令牌（v2 invisible）
   *
   * @returns 验证令牌
   */
  async execute(): Promise<string> {
    const grecaptcha = getGrecaptcha();
    if (!grecaptcha) {
      throw new Error("reCAPTCHA 脚本未加载，请先调用 load()");
    }

    if (this.options.version === "v3") {
      // v3 执行
      const token = await grecaptcha.execute(this.options.siteKey, {
        action: this.options.action,
      });
      this.options.onSuccess?.(token);

      // 设置了 verifyUrl 则自动验证
      if (this.options.verifyUrl) {
        await this.verifyToken(token);
      }

      return token;
    } else {
      // v2 获取响应
      const token = this.getResponse();
      if (!token) {
        throw new Error("请先完成 reCAPTCHA 验证");
      }
      return token;
    }
  }

  /**
   * 发送 token 到服务端验证
   *
   * @param token - reCAPTCHA token
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
          provider: "recaptcha",
          version: this.options.version,
          action: this.options.action,
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
   * 获取验证响应（v2）
   *
   * @returns 验证令牌，如果未验证则返回空字符串
   */
  getResponse(): string {
    const grecaptcha = getGrecaptcha();
    if (!grecaptcha) {
      return "";
    }

    return grecaptcha.getResponse(this.widgetId ?? undefined);
  }

  /**
   * 重置 reCAPTCHA
   */
  reset(): void {
    const grecaptcha = getGrecaptcha();
    if (!grecaptcha) {
      return;
    }

    grecaptcha.reset(this.widgetId ?? undefined);
  }

  /**
   * 获取脚本 URL
   *
   * @returns 脚本 URL
   */
  getScriptUrl(): string {
    let url = RECAPTCHA_SCRIPT_URL;
    const params: string[] = [];

    if (this.options.version === "v3") {
      params.push(`render=${this.options.siteKey}`);
    } else {
      params.push("render=explicit");
    }

    if (this.options.hl) {
      params.push(`hl=${this.options.hl}`);
    }

    if (params.length > 0) {
      url += `?${params.join("&")}`;
    }

    return url;
  }
}

/**
 * 创建 reCAPTCHA 客户端实例
 *
 * @param options - 配置选项
 * @returns reCAPTCHA 客户端实例
 *
 * @example 自动验证（推荐）
 * ```typescript
 * import { createRecaptchaClient } from "@dreamer/humancheck/client/recaptcha";
 *
 * // v2 - 用户完成验证后自动发送请求
 * const recaptcha = createRecaptchaClient({
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
 * await recaptcha.load();
 * recaptcha.render("#container");
 * ```
 *
 * @example 手动验证（不设置 verifyUrl）
 * ```typescript
 * const recaptcha = createRecaptchaClient({
 *   siteKey: "your-site-key",
 *   // 不设置 verifyUrl，手动处理 token
 *   onSuccess: (token) => {
 *     console.log("获取到 token:", token);
 *     // 手动发送到服务端
 *   },
 * });
 *
 * await recaptcha.load();
 * recaptcha.render("#container");
 * ```
 */
export function createRecaptchaClient(
  options: RecaptchaClientOptions,
): RecaptchaClient {
  return new RecaptchaClient(options);
}
