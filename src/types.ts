/**
 * @module @dreamer/humancheck/types
 *
 * @fileoverview 人机验证库类型定义
 *
 * 定义了验证器、挑战、存储等核心类型接口。
 */

// ============================================================================
// 核心类型
// ============================================================================

/**
 * 验证结果
 */
export interface VerifyResult {
  /** 是否验证通过 */
  success: boolean;
  /** 错误信息（验证失败时） */
  error?: string;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 挑战记录
 */
export interface ChallengeRecord {
  /** 挑战 ID */
  id: string;
  /** 挑战类型 */
  type: ChallengeType;
  /** 正确答案（或验证所需数据） */
  answer: unknown;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 过期时间戳（毫秒） */
  expiresAt: number;
  /** 验证尝试次数 */
  attempts: number;
  /** 最大尝试次数 */
  maxAttempts: number;
  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 挑战类型
 */
export type ChallengeType =
  | "image" // 图形验证码
  | "math" // 数学验证码
  | "slider" // 滑块验证码
  | "puzzle" // 拼图验证码
  | "click" // 点选验证码
  | "totp" // TOTP（Google Authenticator）
  | "hotp" // HOTP（计数器）
  | "sms" // 短信验证码
  | "email"; // 邮箱验证码

// ============================================================================
// 挑战接口
// ============================================================================

/**
 * 挑战创建结果
 */
export interface ChallengeCreateResult<T = unknown> {
  /** 挑战 ID */
  id: string;
  /** 返回给客户端的数据（如图片、问题等） */
  data: T;
  /** 过期时间（秒） */
  expiresIn: number;
}

/**
 * 挑战接口
 *
 * 所有验证码类型必须实现此接口
 */
export interface Challenge<TData = unknown, TAnswer = unknown> {
  /** 挑战类型 */
  readonly type: ChallengeType;

  /**
   * 生成挑战
   *
   * @param options - 生成选项
   * @returns 挑战数据和答案
   */
  generate(options?: Record<string, unknown>): {
    /** 返回给客户端的数据 */
    data: TData;
    /** 正确答案（存储在服务端） */
    answer: TAnswer;
  };

  /**
   * 验证答案
   *
   * @param answer - 存储的正确答案
   * @param userInput - 用户输入的答案
   * @param options - 验证选项
   * @returns 验证结果
   */
  verify(
    answer: TAnswer,
    userInput: unknown,
    options?: Record<string, unknown>,
  ): VerifyResult;
}

// ============================================================================
// 图形验证码
// ============================================================================

/**
 * 图形验证码配置
 */
export interface ImageChallengeOptions {
  /** 验证码长度（默认 4） */
  length?: number;
  /** 字符集（默认数字+大写字母，排除易混淆字符） */
  charset?: string;
  /** 图片宽度（默认 150） */
  width?: number;
  /** 图片高度（默认 50） */
  height?: number;
  /** 干扰线数量（默认 6） */
  noiseLines?: number;
  /** 干扰点数量（默认 80） */
  noiseDots?: number;
  /** 干扰圆弧数量（默认 4） */
  noiseArcs?: number;
  /** 背景颜色（默认 "#f5f5f5"，设为 "random" 使用随机浅色） */
  backgroundColor?: string;
  /** 文字颜色列表（设为 "random" 使用随机深色） */
  textColors?: string[] | "random";
  /** 干扰元素颜色（设为 "random" 使用随机色） */
  noiseColors?: string[] | "random";
  /** 是否区分大小写（默认 false） */
  caseSensitive?: boolean;
  /** 文字旋转角度范围（默认 35） */
  rotateRange?: number;
  /** 文字大小变化范围（默认 0.2，即 0.8-1.2 倍） */
  fontSizeVariation?: number;
  /** 文字位置随机偏移（默认 8） */
  positionVariation?: number;
  /** 是否添加文字描边（默认 true） */
  textStroke?: boolean;
  /** 是否添加波浪扭曲（默认 true） */
  waveDistortion?: boolean;
  /** 字体列表 */
  fontFamilies?: string[];
}

/**
 * 图形验证码数据（返回给客户端）
 */
export interface ImageChallengeData {
  /** Base64 编码的 SVG 图片（data:image/svg+xml;base64,...） */
  image: string;
}

// ============================================================================
// 数学验证码
// ============================================================================

/**
 * 数学验证码配置
 */
export interface MathChallengeOptions {
  /** 运算类型（默认 ["+", "-"]） */
  operators?: Array<"+" | "-" | "*">;
  /** 最小数值（默认 1） */
  minNumber?: number;
  /** 最大数值（默认 20） */
  maxNumber?: number;
  /** 是否显示为图片（默认 true） */
  asImage?: boolean;
  /** 图片配置 */
  imageOptions?: Omit<
    ImageChallengeOptions,
    "length" | "charset" | "caseSensitive"
  >;
}

/**
 * 数学验证码数据（返回给客户端）
 */
export interface MathChallengeData {
  /** 数学表达式（如 "3 + 5 = ?"） */
  question: string;
  /** Base64 编码的 SVG 图片（可选，当 asImage 为 true 时） */
  image?: string;
}

// ============================================================================
// 滑块验证码
// ============================================================================

/**
 * 滑块验证码配置
 */
export interface SliderChallengeOptions {
  /** 滑块宽度（默认 300） */
  width?: number;
  /** 滑块高度（默认 60） */
  height?: number;
  /** 目标位置容差（像素，默认 5） */
  tolerance?: number;
  /** 背景颜色（默认 "#f0f0f0"，设为 "random" 使用随机浅色） */
  backgroundColor?: string;
  /** 滑块颜色（默认 "#4caf50"） */
  sliderColor?: string;
  /** 目标颜色（默认 "#2196f3"） */
  targetColor?: string;
  /** 干扰线数量（默认 8） */
  noiseLines?: number;
  /** 干扰点数量（默认 50） */
  noiseDots?: number;
  /** 干扰颜色（设为 "random" 使用随机色） */
  noiseColors?: string[] | "random";
  /** 是否验证轨迹（检测拖动路径是否像人类，默认 true） */
  validateTrack?: boolean;
  /** 是否验证时间（检测拖动时间是否合理，默认 true） */
  validateTime?: boolean;
  /** 最小拖动时间（毫秒，默认 200） */
  minDragTime?: number;
  /** 最大拖动时间（毫秒，默认 10000） */
  maxDragTime?: number;
  /** 最小轨迹点数（默认 5） */
  minTrackPoints?: number;
}

/**
 * 滑块验证码数据（返回给客户端）
 */
export interface SliderChallengeData {
  /** 背景 SVG（Base64） */
  background: string;
  /** 滑块宽度 */
  width: number;
  /** 滑块高度 */
  height: number;
  /** 目标位置提示 */
  hint?: string;
  /** 是否需要轨迹数据 */
  requireTrack?: boolean;
  /** 是否需要时间数据 */
  requireTime?: boolean;
}

/**
 * 滑块验证码答案
 */
export interface SliderChallengeAnswer {
  /** 目标 X 坐标 */
  targetX: number;
  /** 容差 */
  tolerance: number;
  /** 是否验证轨迹 */
  validateTrack: boolean;
  /** 是否验证时间 */
  validateTime: boolean;
  /** 最小拖动时间 */
  minDragTime: number;
  /** 最大拖动时间 */
  maxDragTime: number;
  /** 最小轨迹点数 */
  minTrackPoints: number;
}

/**
 * 滑块用户输入
 */
export interface SliderUserInput {
  /** 最终 X 坐标 */
  x: number;
  /** 拖动轨迹（可选，[x, y, timestamp][]） */
  track?: Array<[number, number, number]>;
  /** 开始时间戳（可选） */
  startTime?: number;
  /** 结束时间戳（可选） */
  endTime?: number;
}

// ============================================================================
// TOTP（基于时间的一次性密码）
// ============================================================================

/**
 * TOTP 配置
 */
export interface TotpOptions {
  /** 应用名称（显示在验证器中） */
  issuer?: string;
  /** 验证码位数（默认 6） */
  digits?: number;
  /** 有效期（秒，默认 30） */
  period?: number;
  /** 哈希算法（默认 "SHA1"） */
  algorithm?: "SHA1" | "SHA256" | "SHA512";
  /** 时间窗口容差（允许前后多少个周期，默认 1） */
  window?: number;
}

/**
 * TOTP 密钥生成结果
 */
export interface TotpSecretResult {
  /** Base32 编码的密钥 */
  secret: string;
  /** otpauth:// URL（用于生成二维码） */
  otpauthUrl: string;
  /** Base64 编码的二维码 SVG */
  qrCode: string;
}

// ============================================================================
// 短信/邮箱验证码
// ============================================================================

/**
 * OTP 验证码配置（短信/邮箱通用）
 */
export interface OtpChallengeOptions {
  /** 验证码长度（默认 6） */
  length?: number;
  /** 字符集（默认纯数字） */
  charset?: string;
  /** 过期时间（秒，默认 300） */
  expiresIn?: number;
}

/**
 * 短信验证码发送选项
 */
export interface SmsChallengeOptions extends OtpChallengeOptions {
  /** 手机号码 */
  phone: string;
  /** 短信模板（使用 {code} 作为验证码占位符） */
  template?: string;
}

/**
 * 邮箱验证码发送选项
 */
export interface EmailChallengeOptions extends OtpChallengeOptions {
  /** 邮箱地址 */
  email: string;
  /** 邮件主题 */
  subject?: string;
  /** 邮件模板（使用 {code} 作为验证码占位符） */
  template?: string;
}

// ============================================================================
// 第三方服务
// ============================================================================

/**
 * 第三方验证服务配置基类
 */
export interface ProviderConfig {
  /** 站点密钥（客户端使用） */
  siteKey: string;
  /** 私钥（服务端使用） */
  secretKey: string;
}

/**
 * Google reCAPTCHA 配置
 */
export interface RecaptchaConfig extends ProviderConfig {
  /** 版本（默认 "v2"） */
  version?: "v2" | "v3";
  /** 最低分数阈值（v3 专用，默认 0.5） */
  minScore?: number;
  /** 预期动作（v3 专用） */
  action?: string;
}

/**
 * Cloudflare Turnstile 配置
 */
export interface TurnstileConfig extends ProviderConfig {
  /** 是否为隐式模式 */
  invisible?: boolean;
}

/**
 * 第三方验证服务接口
 */
export interface Provider {
  /** 提供商名称 */
  readonly name: string;

  /**
   * 验证令牌
   *
   * @param token - 客户端获取的令牌
   * @param remoteIp - 用户 IP（可选）
   * @returns 验证结果
   */
  verify(token: string, remoteIp?: string): Promise<VerifyResult>;

  /**
   * 获取客户端脚本 URL
   */
  getScriptUrl(): string;

  /**
   * 获取客户端配置
   */
  getClientConfig(): Record<string, unknown>;
}

// ============================================================================
// 存储接口
// ============================================================================

/**
 * 存储适配器接口
 */
export interface Store {
  /**
   * 保存挑战记录
   *
   * @param record - 挑战记录
   */
  set(record: ChallengeRecord): Promise<void>;

  /**
   * 获取挑战记录
   *
   * @param id - 挑战 ID
   * @returns 挑战记录或 null
   */
  get(id: string): Promise<ChallengeRecord | null>;

  /**
   * 删除挑战记录
   *
   * @param id - 挑战 ID
   */
  delete(id: string): Promise<void>;

  /**
   * 更新挑战记录
   *
   * @param id - 挑战 ID
   * @param updates - 部分更新
   */
  update(id: string, updates: Partial<ChallengeRecord>): Promise<void>;

  /**
   * 清理过期记录
   */
  cleanup(): Promise<void>;

  /**
   * 获取当前记录数
   */
  size(): Promise<number>;
}

/**
 * 内存存储配置
 */
export interface MemoryStoreOptions {
  /** 最大记录数（默认 10000） */
  maxRecords?: number;
  /** 自动清理间隔（毫秒，默认 60000，设为 0 禁用） */
  cleanupInterval?: number;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

// ============================================================================
// 核心验证器配置
// ============================================================================

/**
 * 验证器配置
 */
export interface HumanCheckOptions {
  /** 存储适配器（默认内存存储） */
  store?: Store;
  /** 默认过期时间（秒，默认 300） */
  defaultExpiresIn?: number;
  /** 默认最大尝试次数（默认 5） */
  defaultMaxAttempts?: number;
  /** 最大记录数（默认 10000，仅内存存储有效） */
  maxRecords?: number;
  /** 是否启用调试日志（默认 false） */
  debug?: boolean;
}

/**
 * 创建挑战选项
 */
export interface CreateOptions {
  /** 过期时间（秒） */
  expiresIn?: number;
  /** 最大尝试次数 */
  maxAttempts?: number;
  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 验证选项
 */
export interface VerifyOptions {
  /** 验证后是否删除记录（默认 true） */
  deleteOnVerify?: boolean;
  /** 额外验证参数 */
  params?: Record<string, unknown>;
}
