/**
 * @module @dreamer/humancheck/core
 *
 * @fileoverview 核心验证器
 *
 * 提供统一的验证器接口，管理挑战的创建、存储和验证。
 * 支持注册挑战类型，简化验证流程。
 *
 * @example
 * ```typescript
 * import {
 *   createHumanCheck,
 *   createImageChallenge,
 *   createMathChallenge,
 * } from "@dreamer/humancheck";
 *
 * const humanCheck = createHumanCheck();
 *
 * // 注册挑战类型
 * humanCheck.register("image", createImageChallenge({ length: 4 }));
 * humanCheck.register("math", createMathChallenge());
 *
 * // 创建挑战（使用注册的类型）
 * const { id, data } = await humanCheck.create("image");
 *
 * // 验证（自动使用对应的挑战类型）
 * const result = await humanCheck.verify(id, userInput);
 * ```
 */

import { MemoryStore } from "./stores/memory.ts";
import { $tr } from "./i18n.ts";
import type {
  Challenge,
  ChallengeCreateResult,
  ChallengeRecord,
  ChallengeType,
  CreateOptions,
  HumanCheckOptions,
  Store,
  VerifyOptions,
  VerifyResult,
} from "./types.ts";

/**
 * 核心验证器类
 *
 * 统一管理各种类型的验证挑战，负责：
 * - 注册挑战类型
 * - 创建挑战并生成唯一 ID
 * - 存储挑战数据
 * - 验证用户输入
 * - 管理挑战生命周期
 *
 * @example
 * ```typescript
 * const humanCheck = new HumanCheck({
 *   defaultExpiresIn: 300,
 *   defaultMaxAttempts: 5,
 * });
 *
 * // 注册挑战类型
 * humanCheck.register("image", imageChallenge);
 *
 * // 创建和验证
 * const { id, data } = await humanCheck.create("image");
 * const result = await humanCheck.verify(id, userInput);
 * ```
 */
export class HumanCheck {
  /** 存储适配器 */
  private store: Store;

  /** 配置选项 */
  private options: Required<HumanCheckOptions>;

  /** 注册的挑战类型 */
  private challenges: Map<ChallengeType, Challenge<unknown, unknown>> =
    new Map();

  /**
   * 创建验证器实例
   *
   * @param options - 配置选项
   */
  constructor(options: HumanCheckOptions = {}) {
    this.options = {
      store: options.store ?? new MemoryStore(),
      defaultExpiresIn: options.defaultExpiresIn ?? 300,
      defaultMaxAttempts: options.defaultMaxAttempts ?? 5,
      maxRecords: options.maxRecords ?? 10000,
      debug: options.debug ?? false,
    };
    this.store = this.options.store;
  }

  /**
   * 注册挑战类型
   *
   * 注册后可以通过类型名称创建和验证挑战。
   *
   * @param type - 挑战类型
   * @param challenge - 挑战实例
   *
   * @example
   * ```typescript
   * humanCheck.register("image", createImageChallenge({ length: 4 }));
   * humanCheck.register("math", createMathChallenge());
   * humanCheck.register("slider", createSliderChallenge());
   * ```
   */
  register(type: ChallengeType, challenge: Challenge<unknown, unknown>): void {
    this.challenges.set(type, challenge);

    if (this.options.debug) {
      console.log($tr("humancheck.core.logRegisterType", { type }));
    }
  }

  /**
   * 取消注册挑战类型
   *
   * @param type - 挑战类型
   */
  unregister(type: ChallengeType): void {
    this.challenges.delete(type);
  }

  /**
   * 获取已注册的挑战类型
   *
   * @returns 已注册的类型列表
   */
  getRegisteredTypes(): ChallengeType[] {
    return Array.from(this.challenges.keys());
  }

  /**
   * 创建验证挑战（使用注册的类型）
   *
   * @param type - 挑战类型
   * @param options - 创建选项
   * @returns 挑战 ID 和客户端数据
   *
   * @example
   * ```typescript
   * const { id, data, expiresIn } = await humanCheck.create("image", {
   *   expiresIn: 120,
   *   maxAttempts: 3,
   * });
   * ```
   */
  async create<TData = unknown>(
    type: ChallengeType,
    options?: CreateOptions,
  ): Promise<ChallengeCreateResult<TData>>;

  /**
   * 创建验证挑战（直接传入挑战实例）
   *
   * @param challenge - 挑战实例
   * @param options - 创建选项
   * @returns 挑战 ID 和客户端数据
   *
   * @example
   * ```typescript
   * const { id, data } = await humanCheck.create(imageChallenge);
   * ```
   */
  async create<TData>(
    challenge: Challenge<TData, unknown>,
    options?: CreateOptions,
  ): Promise<ChallengeCreateResult<TData>>;

  /**
   * 创建验证挑战（实现）
   */
  async create<TData>(
    typeOrChallenge: ChallengeType | Challenge<TData, unknown>,
    options: CreateOptions = {},
  ): Promise<ChallengeCreateResult<TData>> {
    // 获取挑战实例
    let challenge: Challenge<TData, unknown>;

    if (typeof typeOrChallenge === "string") {
      // 通过类型名称获取
      const registered = this.challenges.get(typeOrChallenge);
      if (!registered) {
        throw new Error(
          $tr("humancheck.core.challengeTypeNotRegistered", {
            type: typeOrChallenge,
          }),
        );
      }
      challenge = registered as Challenge<TData, unknown>;
    } else {
      // 直接使用传入的实例
      challenge = typeOrChallenge;
    }

    // 生成挑战
    const { data, answer } = challenge.generate();

    // 生成唯一 ID
    const id = crypto.randomUUID();

    // 计算过期时间
    const expiresIn = options.expiresIn ?? this.options.defaultExpiresIn;
    const now = Date.now();
    const expiresAt = now + expiresIn * 1000;

    // 创建挑战记录
    const record: ChallengeRecord = {
      id,
      type: challenge.type,
      answer,
      createdAt: now,
      expiresAt,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? this.options.defaultMaxAttempts,
      metadata: options.metadata,
    };

    // 存储记录
    await this.store.set(record);

    // 调试日志
    if (this.options.debug) {
      console.log(
        $tr("humancheck.core.logCreateChallenge", { id, type: challenge.type }),
      );
    }

    return {
      id,
      data,
      expiresIn,
    };
  }

  /**
   * 验证用户输入（自动使用注册的挑战类型）
   *
   * @param id - 挑战 ID
   * @param userInput - 用户输入
   * @param options - 验证选项
   * @returns 验证结果
   *
   * @example
   * ```typescript
   * const result = await humanCheck.verify(id, userCode);
   * if (result.success) {
   *   console.log("验证通过");
   * }
   * ```
   */
  async verify(
    id: string,
    userInput: unknown,
    options?: VerifyOptions,
  ): Promise<VerifyResult>;

  /**
   * 验证用户输入（指定挑战实例）
   *
   * @param id - 挑战 ID
   * @param userInput - 用户输入
   * @param challenge - 挑战实例
   * @param options - 验证选项
   * @returns 验证结果
   */
  async verify(
    id: string,
    userInput: unknown,
    challenge: Challenge<unknown, unknown>,
    options?: VerifyOptions,
  ): Promise<VerifyResult>;

  /**
   * 验证用户输入（实现）
   */
  async verify(
    id: string,
    userInput: unknown,
    challengeOrOptions?: Challenge<unknown, unknown> | VerifyOptions,
    maybeOptions?: VerifyOptions,
  ): Promise<VerifyResult> {
    // 解析参数
    let challenge: Challenge<unknown, unknown> | undefined;
    let options: VerifyOptions = {};

    if (
      challengeOrOptions &&
      typeof challengeOrOptions === "object" &&
      "type" in challengeOrOptions
    ) {
      // 传入了挑战实例
      challenge = challengeOrOptions as Challenge<unknown, unknown>;
      options = maybeOptions ?? {};
    } else {
      // 没有传入挑战实例，使用注册的类型
      options = (challengeOrOptions as VerifyOptions) ?? {};
    }

    // 获取挑战记录
    const record = await this.store.get(id);

    // 检查记录是否存在
    if (!record) {
      return {
        success: false,
        error: "验证码不存在或已过期",
      };
    }

    // 检查是否已过期
    if (Date.now() > record.expiresAt) {
      await this.store.delete(id);
      return {
        success: false,
        error: "验证码已过期",
      };
    }

    // 检查尝试次数
    if (record.attempts >= record.maxAttempts) {
      await this.store.delete(id);
      return {
        success: false,
        error: "验证码尝试次数已用完",
      };
    }

    // 获取挑战实例
    if (!challenge) {
      challenge = this.challenges.get(record.type);
      if (!challenge) {
        return {
          success: false,
          error: `挑战类型 "${record.type}" 未注册`,
        };
      }
    }

    // 增加尝试次数
    await this.store.update(id, {
      attempts: record.attempts + 1,
    });

    // 执行验证
    const result = challenge.verify(record.answer, userInput, options.params);

    // 调试日志
    if (this.options.debug) {
      console.log(
        `[HumanCheck] 验证挑战: id=${id}, success=${result.success}`,
      );
    }

    // 验证成功或达到最大尝试次数时删除记录
    const deleteOnVerify = options.deleteOnVerify ?? true;
    if (result.success && deleteOnVerify) {
      await this.store.delete(id);
    }

    return result;
  }

  /**
   * 手动删除挑战
   *
   * @param id - 挑战 ID
   */
  async revoke(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /**
   * 获取挑战状态
   *
   * @param id - 挑战 ID
   * @returns 挑战状态或 null
   */
  async getStatus(
    id: string,
  ): Promise<
    { exists: boolean; expired: boolean; attemptsLeft: number } | null
  > {
    const record = await this.store.get(id);

    if (!record) {
      return null;
    }

    const now = Date.now();
    const expired = now > record.expiresAt;
    const attemptsLeft = record.maxAttempts - record.attempts;

    return {
      exists: true,
      expired,
      attemptsLeft,
    };
  }

  /**
   * 清理过期挑战
   */
  async cleanup(): Promise<void> {
    await this.store.cleanup();
  }

  /**
   * 获取存储适配器
   *
   * @returns 存储适配器实例
   */
  getStore(): Store {
    return this.store;
  }
}

/**
 * 创建验证器实例
 *
 * @param options - 配置选项
 * @returns 验证器实例
 *
 * @example
 * ```typescript
 * import { createHumanCheck, createImageChallenge } from "@dreamer/humancheck";
 *
 * const humanCheck = createHumanCheck({
 *   defaultExpiresIn: 300,
 *   defaultMaxAttempts: 5,
 * });
 *
 * // 注册挑战类型
 * humanCheck.register("image", createImageChallenge());
 *
 * // 创建和验证
 * const { id, data } = await humanCheck.create("image");
 * const result = await humanCheck.verify(id, userInput);
 * ```
 */
export function createHumanCheck(options: HumanCheckOptions = {}): HumanCheck {
  return new HumanCheck(options);
}
