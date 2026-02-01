/**
 * @module @dreamer/humancheck/client/types
 *
 * @fileoverview 客户端类型定义
 *
 * 定义了客户端交互组件和第三方服务集成的类型。
 */

// ============================================================================
// 通用类型
// ============================================================================

/**
 * 客户端回调函数
 */
export interface ClientCallbacks {
  /** 成功回调 */
  onSuccess?: (token: string) => void;
  /** 失败回调 */
  onError?: (error: Error) => void;
  /** 过期回调 */
  onExpire?: () => void;
}

// ============================================================================
// 滑块验证码客户端
// ============================================================================

/**
 * 滑块客户端配置
 */
export interface SliderClientOptions {
  /** 滑块元素或选择器 */
  slider: HTMLElement | string;
  /** 轨道元素或选择器 */
  track: HTMLElement | string;
  /** 挑战 ID */
  challengeId: string;
  /** 验证 API 地址（设置后拖动结束自动验证） */
  verifyUrl?: string;
  /** 是否收集轨迹数据（默认 true） */
  collectTrack?: boolean;
  /** 轨迹采样间隔（毫秒，默认 20） */
  trackSampleInterval?: number;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 开始拖动回调 */
  onStart?: () => void;
  /** 拖动中回调 */
  onMove?: (x: number, y: number) => void;
  /** 拖动结束回调（未设置 verifyUrl 时使用） */
  onEnd?: (data: SliderVerifyData) => void;
  /** 服务端验证成功回调 */
  onVerified?: (result: SliderVerifyResult) => void;
  /** 验证失败回调 */
  onError?: (error: string) => void;
}

/**
 * 滑块验证数据（发送给服务端）
 */
export interface SliderVerifyData {
  /** 最终 X 坐标 */
  x: number;
  /** 拖动轨迹 [x, y, timestamp][] */
  track: Array<[number, number, number]>;
  /** 开始时间戳 */
  startTime: number;
  /** 结束时间戳 */
  endTime: number;
  /** 拖动持续时间（毫秒） */
  duration: number;
}

/**
 * 滑块验证结果
 */
export interface SliderVerifyResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 精确度（0-1） */
  accuracy?: number;
}

// ============================================================================
// reCAPTCHA 客户端
// ============================================================================

/**
 * 第三方验证结果
 */
export interface ThirdPartyVerifyResult {
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 分数（v3） */
  score?: number;
  /** 动作（v3） */
  action?: string;
}

/**
 * reCAPTCHA 客户端配置
 */
export interface RecaptchaClientOptions extends ClientCallbacks {
  /** 站点密钥 */
  siteKey: string;
  /** 服务端验证 API 地址（设置后自动验证） */
  verifyUrl?: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 版本（默认 v2） */
  version?: "v2" | "v3";
  /** 主题（v2） */
  theme?: "light" | "dark";
  /** 尺寸（v2） */
  size?: "normal" | "compact" | "invisible";
  /** 动作名称（v3） */
  action?: string;
  /** 语言 */
  hl?: string;
  /** 服务端验证成功回调 */
  onVerified?: (result: ThirdPartyVerifyResult) => void;
}

/**
 * reCAPTCHA 渲染参数
 */
export interface RecaptchaRenderParams {
  /** 站点密钥 */
  sitekey: string;
  /** 主题 */
  theme?: "light" | "dark";
  /** 尺寸 */
  size?: "normal" | "compact" | "invisible";
  /** 成功回调 */
  callback?: (token: string) => void;
  /** 过期回调 */
  "expired-callback"?: () => void;
  /** 错误回调 */
  "error-callback"?: () => void;
}

/**
 * reCAPTCHA 全局对象类型
 */
export interface RecaptchaGlobal {
  /** 渲染 */
  render: (
    container: HTMLElement | string,
    params: RecaptchaRenderParams,
  ) => number;
  /** 获取响应 */
  getResponse: (widgetId?: number) => string;
  /** 重置 */
  reset: (widgetId?: number) => void;
  /** 执行（v3） */
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
  /** 就绪回调（v3） */
  ready: (callback: () => void) => void;
}

// ============================================================================
// Cloudflare Turnstile 客户端
// ============================================================================

/**
 * Turnstile 客户端配置
 */
export interface TurnstileClientOptions extends ClientCallbacks {
  /** 站点密钥 */
  siteKey: string;
  /** 服务端验证 API 地址（设置后自动验证） */
  verifyUrl?: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 主题 */
  theme?: "light" | "dark" | "auto";
  /** 尺寸 */
  size?: "normal" | "compact";
  /** 语言 */
  language?: string;
  /** 外观 */
  appearance?: "always" | "execute" | "interaction-only";
  /** 重试模式 */
  retry?: "auto" | "never";
  /** 重试间隔（毫秒） */
  retryInterval?: number;
  /** 服务端验证成功回调 */
  onVerified?: (result: ThirdPartyVerifyResult) => void;
}

/**
 * Turnstile 渲染参数
 */
export interface TurnstileRenderParams {
  /** 站点密钥 */
  sitekey: string;
  /** 主题 */
  theme?: "light" | "dark" | "auto";
  /** 尺寸 */
  size?: "normal" | "compact";
  /** 成功回调 */
  callback?: (token: string) => void;
  /** 过期回调 */
  "expired-callback"?: () => void;
  /** 错误回调 */
  "error-callback"?: (error: string) => void;
  /** 语言 */
  language?: string;
  /** 外观 */
  appearance?: "always" | "execute" | "interaction-only";
  /** 重试 */
  retry?: "auto" | "never";
  /** 重试间隔 */
  "retry-interval"?: number;
}

/**
 * Turnstile 全局对象类型
 */
export interface TurnstileGlobal {
  /** 渲染 */
  render: (
    container: HTMLElement | string,
    params: TurnstileRenderParams,
  ) => string;
  /** 获取响应 */
  getResponse: (widgetId?: string) => string | undefined;
  /** 重置 */
  reset: (widgetId?: string) => void;
  /** 移除 */
  remove: (widgetId?: string) => void;
  /** 执行 */
  execute: (
    container?: HTMLElement | string,
    params?: TurnstileRenderParams,
  ) => void;
}
