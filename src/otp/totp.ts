/**
 * @module @dreamer/humancheck/otp/totp
 *
 * @fileoverview TOTP（基于时间的一次性密码）
 *
 * 实现 RFC 6238 TOTP 标准，兼容：
 * - Google Authenticator
 * - Microsoft Authenticator
 * - Authy
 * - 其他 TOTP 兼容应用
 *
 * @example
 * ```typescript
 * import { createTotp } from "@dreamer/humancheck";
 *
 * const totp = createTotp({
 *   issuer: "MyApp",
 *   digits: 6,
 *   period: 30,
 * });
 *
 * // 生成密钥（用户首次绑定）
 * const { secret, qrCode, otpauthUrl } = totp.generateSecret("user@example.com");
 *
 * // 验证用户输入的验证码
 * const isValid = totp.verify(secret, "123456");
 * ```
 */

import type { TotpOptions, TotpSecretResult, VerifyResult } from "../types.ts";
import { encodeBase64, LRUCache, timingSafeEqual } from "../utils.ts";

/**
 * Base32 字符集
 */
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * 将字节数组编码为 Base32 字符串
 *
 * @param bytes - 字节数组
 * @returns Base32 字符串
 */
function base32Encode(bytes: Uint8Array): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

/**
 * 将 Base32 字符串解码为字节数组
 *
 * @param str - Base32 字符串
 * @returns 字节数组
 */
function base32Decode(str: string): Uint8Array {
  // 移除空格和转为大写
  const cleanStr = str.replace(/\s/g, "").toUpperCase();

  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    const index = BASE32_CHARS.indexOf(char);

    if (index === -1) {
      continue; // 跳过无效字符
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * 生成随机密钥
 *
 * @param length - 密钥长度（字节）
 * @returns 随机字节数组
 */
function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * 获取 HMAC 算法名称
 *
 * @param algorithm - 算法类型
 * @returns Web Crypto API 算法名称
 */
function getHmacAlgorithm(
  algorithm: "SHA1" | "SHA256" | "SHA512",
): "SHA-1" | "SHA-256" | "SHA-512" {
  switch (algorithm) {
    case "SHA1":
      return "SHA-1";
    case "SHA256":
      return "SHA-256";
    case "SHA512":
      return "SHA-512";
    default:
      return "SHA-1";
  }
}

/**
 * 计算 HMAC
 *
 * @param key - 密钥
 * @param message - 消息
 * @param algorithm - 算法
 * @returns HMAC 结果
 */
async function hmac(
  key: Uint8Array,
  message: Uint8Array,
  algorithm: "SHA-1" | "SHA-256" | "SHA-512",
): Promise<Uint8Array> {
  // 将 Uint8Array 转换为 ArrayBuffer 以满足类型要求
  const keyBuffer = key.buffer.slice(
    key.byteOffset,
    key.byteOffset + key.byteLength,
  ) as ArrayBuffer;
  const messageBuffer = message.buffer.slice(
    message.byteOffset,
    message.byteOffset + message.byteLength,
  ) as ArrayBuffer;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBuffer);
  return new Uint8Array(signature);
}

/**
 * 将数字转换为 8 字节大端序数组
 *
 * @param num - 数字
 * @returns 8 字节数组
 */
function numberToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

/**
 * 动态截断
 *
 * @param hmacResult - HMAC 结果
 * @param digits - 验证码位数
 * @returns 验证码数字
 */
function dynamicTruncation(hmacResult: Uint8Array, digits: number): number {
  // 获取偏移量（最后一个字节的低 4 位）
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;

  // 从偏移量开始提取 4 字节
  const binary = ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  // 取模得到验证码
  const otp = binary % Math.pow(10, digits);

  return otp;
}

/**
 * 生成简单的二维码 SVG
 *
 * @param data - 二维码数据
 * @param size - 尺寸
 * @returns SVG 字符串
 */
function generateQrCodeSvg(data: string, size: number = 200): string {
  // 这里实现一个简化的二维码提示
  // 实际生产中应该使用专业的二维码库
  // 注意：可以使用外部 API 生成真正的二维码：
  // const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

  // 生成一个包含说明和链接的 SVG（使用英文避免编码问题）
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${
      size + 40
    }">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="10" y="10" width="${size - 20}" height="${
      size - 20
    }" fill="#f0f0f0" stroke="#ccc"/>
    <text x="${size / 2}" y="${
      size / 2
    }" font-family="Arial" font-size="12" text-anchor="middle" fill="#666">
      Scan with Authenticator
    </text>
    <text x="${size / 2}" y="${
      size / 2 + 20
    }" font-family="Arial" font-size="10" text-anchor="middle" fill="#999">
      or enter secret manually
    </text>
    <text x="${size / 2}" y="${
      size + 25
    }" font-family="monospace" font-size="8" text-anchor="middle" fill="#333">
      ${data.substring(0, 50)}...
    </text>
  </svg>`;

  return svg;
}

/**
 * TOTP 类
 *
 * 实现基于时间的一次性密码（RFC 6238）。
 *
 * @example
 * ```typescript
 * const totp = new Totp({
 *   issuer: "MyApp",
 *   digits: 6,
 *   period: 30,
 * });
 *
 * const { secret, qrCode } = totp.generateSecret("user@example.com");
 * const isValid = await totp.verify(secret, "123456");
 * ```
 */
export class Totp {
  /** 配置选项 */
  private options: Required<TotpOptions>;

  /** 已使用 token 缓存（防重放攻击） */
  private usedTokens: LRUCache<string, number>;

  /** Base32 密钥解码缓存（性能优化） */
  private secretCache: LRUCache<string, Uint8Array>;

  /**
   * 创建 TOTP 实例
   *
   * @param options - 配置选项
   */
  constructor(options: TotpOptions = {}) {
    this.options = {
      issuer: options.issuer ?? "HumanCheck",
      digits: options.digits ?? 6,
      period: options.period ?? 30,
      algorithm: options.algorithm ?? "SHA1",
      window: options.window ?? 1,
    };

    // 初始化防重放缓存（容量 = 用户数 * 时间窗口 * 2）
    this.usedTokens = new LRUCache<string, number>(10000);

    // 初始化密钥解码缓存
    this.secretCache = new LRUCache<string, Uint8Array>(1000);
  }

  /**
   * 获取或缓存 Base32 解码结果
   *
   * @param secret - Base32 密钥
   * @returns 解码后的字节数组
   */
  private getSecretBytes(secret: string): Uint8Array {
    const cached = this.secretCache.get(secret);
    if (cached) {
      return cached;
    }

    const decoded = base32Decode(secret);
    this.secretCache.set(secret, decoded);
    return decoded;
  }

  /**
   * 生成用于防重放的缓存键
   *
   * @param secret - 密钥
   * @param token - 验证码
   * @param counter - 时间计数器
   * @returns 缓存键
   */
  private getReplayKey(secret: string, token: string, counter: number): string {
    return `${secret.substring(0, 8)}:${token}:${counter}`;
  }

  /**
   * 生成随机密钥
   *
   * @param accountName - 账户名称（如邮箱）
   * @returns 密钥信息
   */
  generateSecret(accountName: string): TotpSecretResult {
    // 生成 20 字节随机密钥
    const secretBytes = generateRandomBytes(20);
    const secret = base32Encode(secretBytes);

    // 生成 otpauth URL
    const encodedIssuer = encodeURIComponent(this.options.issuer);
    const encodedAccount = encodeURIComponent(accountName);
    const otpauthUrl =
      `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${this.options.algorithm}&digits=${this.options.digits}&period=${this.options.period}`;

    // 生成二维码
    const qrSvg = generateQrCodeSvg(otpauthUrl);
    const qrCode = `data:image/svg+xml;base64,${encodeBase64(qrSvg)}`;

    return {
      secret,
      otpauthUrl,
      qrCode,
    };
  }

  /**
   * 生成当前时间的 TOTP
   *
   * @param secret - Base32 编码的密钥
   * @param timestamp - 时间戳（毫秒，默认当前时间）
   * @returns TOTP 验证码
   */
  async generate(secret: string, timestamp?: number): Promise<string> {
    const now = timestamp ?? Date.now();
    const counter = Math.floor(now / 1000 / this.options.period);

    // 使用缓存的密钥解码结果
    const secretBytes = this.getSecretBytes(secret);
    const counterBytes = numberToBytes(counter);
    const algorithm = getHmacAlgorithm(this.options.algorithm);

    const hmacResult = await hmac(secretBytes, counterBytes, algorithm);
    const otp = dynamicTruncation(hmacResult, this.options.digits);

    // 补零到指定位数
    return otp.toString().padStart(this.options.digits, "0");
  }

  /**
   * 验证 TOTP
   *
   * @param secret - Base32 编码的密钥
   * @param token - 用户输入的验证码
   * @param timestamp - 时间戳（毫秒，默认当前时间）
   * @returns 验证结果
   */
  async verify(
    secret: string,
    token: string,
    timestamp?: number,
  ): Promise<VerifyResult> {
    const now = timestamp ?? Date.now();
    const currentCounter = Math.floor(now / 1000 / this.options.period);

    // 移除空格
    const cleanToken = token.replace(/\s/g, "");

    // 检查长度
    if (cleanToken.length !== this.options.digits) {
      return {
        success: false,
        error: `验证码必须是 ${this.options.digits} 位数字`,
      };
    }

    // 检查是否为数字
    if (!/^\d+$/.test(cleanToken)) {
      return {
        success: false,
        error: "验证码必须是纯数字",
      };
    }

    // 在时间窗口内验证
    for (let i = -this.options.window; i <= this.options.window; i++) {
      const checkTime = now + i * this.options.period * 1000;
      const counter = currentCounter + i;
      const expectedToken = await this.generate(secret, checkTime);

      // 使用常量时间比较防止时序攻击
      if (timingSafeEqual(expectedToken, cleanToken)) {
        // 防重放攻击：检查 token 是否已使用
        const replayKey = this.getReplayKey(secret, cleanToken, counter);
        if (this.usedTokens.has(replayKey)) {
          return {
            success: false,
            error: "验证码已被使用",
          };
        }

        // 标记 token 为已使用
        this.usedTokens.set(replayKey, now);

        return {
          success: true,
          data: {
            drift: i, // 时间偏移（周期数）
          },
        };
      }
    }

    return {
      success: false,
      error: "验证码错误或已过期",
    };
  }

  /**
   * 清除已使用 token 缓存
   *
   * 通常在维护或测试时调用。
   */
  clearUsedTokens(): void {
    this.usedTokens.clear();
  }

  /**
   * 获取剩余有效时间（秒）
   *
   * @param timestamp - 时间戳（毫秒，默认当前时间）
   * @returns 剩余秒数
   */
  getRemainingTime(timestamp?: number): number {
    const now = timestamp ?? Date.now();
    const elapsed = Math.floor(now / 1000) % this.options.period;
    return this.options.period - elapsed;
  }
}

/**
 * 创建 TOTP 实例
 *
 * @param options - 配置选项
 * @returns TOTP 实例
 *
 * @example
 * ```typescript
 * import { createTotp } from "@dreamer/humancheck";
 *
 * const totp = createTotp({
 *   issuer: "MyApp",
 *   digits: 6,
 *   period: 30,
 * });
 *
 * const { secret, qrCode } = totp.generateSecret("user@example.com");
 * ```
 */
export function createTotp(options: TotpOptions = {}): Totp {
  return new Totp(options);
}
