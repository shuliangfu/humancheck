/**
 * @module @dreamer/humancheck/utils
 *
 * @fileoverview 公共工具函数
 *
 * 提供验证码生成、编码、安全比较等通用功能。
 */

// ============================================================================
// 编码工具
// ============================================================================

/**
 * 将字符串编码为 Base64（支持 UTF-8）
 *
 * 使用 TextEncoder 确保正确处理 UTF-8 字符串，
 * 避免 btoa 处理非 Latin1 字符时的错误。
 *
 * @param str - 要编码的字符串
 * @returns Base64 字符串
 *
 * @example
 * ```typescript
 * const encoded = encodeBase64("<svg>...</svg>");
 * ```
 */
export function encodeBase64(str: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

// ============================================================================
// 随机数工具
// ============================================================================

/**
 * 生成指定范围内的随机浮点数
 *
 * @param min - 最小值（包含）
 * @param max - 最大值（不包含）
 * @returns 随机浮点数
 *
 * @example
 * ```typescript
 * const angle = random(0, Math.PI * 2);
 * ```
 */
export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 生成指定范围内的随机整数
 *
 * @param min - 最小值（包含）
 * @param max - 最大值（包含）
 * @returns 随机整数
 *
 * @example
 * ```typescript
 * const index = randomInt(0, array.length - 1);
 * ```
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 从数组中随机选择一个元素
 *
 * @param array - 源数组
 * @returns 随机元素
 *
 * @example
 * ```typescript
 * const color = randomChoice(colors);
 * ```
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 生成随机字符串
 *
 * @param length - 字符串长度
 * @param charset - 字符集
 * @returns 随机字符串
 *
 * @example
 * ```typescript
 * const code = randomString(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
 * ```
 */
export function randomString(length: number, charset: string): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}

// ============================================================================
// 安全工具
// ============================================================================

/**
 * 常量时间字符串比较
 *
 * 防止时序攻击，确保比较时间与字符串内容无关。
 * 无论字符串在哪个位置不同，比较时间都是恒定的。
 *
 * @param a - 第一个字符串
 * @param b - 第二个字符串
 * @returns 是否相等
 *
 * @example
 * ```typescript
 * // 安全比较验证码
 * if (timingSafeEqual(userInput, correctAnswer)) {
 *   console.log("验证通过");
 * }
 * ```
 */
export function timingSafeEqual(a: string, b: string): boolean {
  // 长度不同时也要完成完整比较，防止泄露长度信息
  const maxLength = Math.max(a.length, b.length);
  let result = a.length === b.length ? 0 : 1;

  for (let i = 0; i < maxLength; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }

  return result === 0;
}

/**
 * 常量时间数字比较
 *
 * @param a - 第一个数字
 * @param b - 第二个数字
 * @returns 是否相等
 */
export function timingSafeEqualNumber(a: number, b: number): boolean {
  // 使用异或比较，结果为 0 表示相等
  return (a ^ b) === 0;
}

// ============================================================================
// 颜色工具
// ============================================================================

/**
 * 生成随机颜色（HSL 格式转 RGB）
 *
 * 使用 HSL 色彩空间确保颜色鲜艳且可控。
 *
 * @param options - 颜色选项
 * @returns 十六进制颜色字符串
 *
 * @example
 * ```typescript
 * const color = randomColor({ saturation: [60, 80], lightness: [30, 50] });
 * ```
 */
export function randomColor(options?: {
  /** 色相范围 [min, max]（0-360） */
  hue?: [number, number];
  /** 饱和度范围 [min, max]（0-100） */
  saturation?: [number, number];
  /** 亮度范围 [min, max]（0-100） */
  lightness?: [number, number];
}): string {
  const h = random(options?.hue?.[0] ?? 0, options?.hue?.[1] ?? 360);
  const s = random(
    options?.saturation?.[0] ?? 50,
    options?.saturation?.[1] ?? 80,
  );
  const l = random(
    options?.lightness?.[0] ?? 30,
    options?.lightness?.[1] ?? 50,
  );

  return hslToHex(h, s, l);
}

/**
 * HSL 转十六进制颜色
 *
 * @param h - 色相（0-360）
 * @param s - 饱和度（0-100）
 * @param l - 亮度（0-100）
 * @returns 十六进制颜色字符串
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============================================================================
// 数组/集合工具
// ============================================================================

/**
 * 从颜色数组或随机生成颜色
 *
 * @param colors - 颜色数组或 "random"
 * @returns 颜色值
 */
export function getColor(colors: string[] | "random"): string {
  if (colors === "random") {
    return randomColor();
  }
  return randomChoice(colors);
}

// ============================================================================
// LRU 缓存
// ============================================================================

/**
 * LRU 缓存实现
 *
 * 用于缓存最近使用的数据，超出容量时淘汰最久未使用的项。
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, Uint8Array>(100);
 * cache.set("key", data);
 * const cached = cache.get("key");
 * ```
 */
export class LRUCache<K, V> {
  /** 缓存数据 */
  private cache: Map<K, V> = new Map();

  /** 最大容量 */
  private maxSize: number;

  /**
   * 创建 LRU 缓存
   *
   * @param maxSize - 最大容量
   */
  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存项
   *
   * 访问后会将该项移到最近使用位置。
   *
   * @param key - 键
   * @returns 值或 undefined
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // 移到最近使用位置
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * 设置缓存项
   *
   * @param key - 键
   * @param value - 值
   */
  set(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } // 如果已满，删除最旧的（Map 的第一个元素）
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * 检查是否存在
   *
   * @param key - 键
   * @returns 是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除缓存项
   *
   * @param key - 键
   */
  delete(key: K): void {
    this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// 时间工具
// ============================================================================

/**
 * 获取当前时间戳（毫秒）
 *
 * @returns 时间戳
 */
export function now(): number {
  return Date.now();
}

/**
 * 等待指定时间
 *
 * @param ms - 毫秒数
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
