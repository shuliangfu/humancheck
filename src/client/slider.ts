/**
 * @module @dreamer/humancheck/client/slider
 *
 * @fileoverview 滑块验证码客户端交互
 *
 * 提供滑块拖动的交互逻辑，内置自动验证功能：
 * - 鼠标和触摸事件
 * - 轨迹数据收集
 * - 自动发送验证请求
 *
 * @example
 * ```typescript
 * import { createSliderClient } from "@dreamer/humancheck/client/slider";
 *
 * // 只需传入必要参数，拖动结束自动验证
 * const slider = createSliderClient({
 *   slider: "#handle",
 *   track: "#track",
 *   challengeId: "xxx",
 *   verifyUrl: "/api/humancheck/verify",
 *   onVerified: (result) => console.log("验证通过！", result),
 *   onError: (error) => console.log("验证失败:", error),
 * });
 *
 * slider.init();
 * ```
 */

import type {
  SliderClientOptions,
  SliderVerifyData,
  SliderVerifyResult,
} from "./types.ts";

/**
 * 滑块客户端类
 *
 * 处理滑块拖动交互，内置自动验证功能。
 *
 * @example
 * ```typescript
 * const slider = new SliderClient({
 *   slider: "#handle",
 *   track: "#track",
 *   challengeId: "abc123",
 *   verifyUrl: "/api/slider/verify",
 *   onVerified: () => alert("验证成功！"),
 * });
 * slider.init();
 * ```
 */
export class SliderClient {
  /** 滑块元素 */
  private sliderEl: HTMLElement | null = null;

  /** 轨道元素 */
  private trackEl: HTMLElement | null = null;

  /** 配置选项 */
  private options:
    & Required<
      Pick<SliderClientOptions, "collectTrack" | "trackSampleInterval">
    >
    & SliderClientOptions;

  /** 是否正在拖动 */
  private isDragging = false;

  /** 起始 X 坐标（相对于轨道） */
  private startX = 0;

  /** 起始 Y 坐标 */
  private startY = 0;

  /** 滑块起始位置 */
  private sliderStartX = 0;

  /** 当前 X 位置 */
  private currentX = 0;

  /** 当前 Y 位置 */
  private currentY = 0;

  /** 是否已初始化 */
  private initialized = false;

  /** 拖动开始时间 */
  private dragStartTime = 0;

  /** 轨迹数据 [x, y, timestamp][] */
  private trackData: Array<[number, number, number]> = [];

  /** 上次采样时间 */
  private lastSampleTime = 0;

  /** 是否正在验证 */
  private isVerifying = false;

  /**
   * 创建滑块客户端实例
   *
   * @param options - 配置选项
   */
  constructor(options: SliderClientOptions) {
    this.options = {
      ...options,
      collectTrack: options.collectTrack ?? true,
      trackSampleInterval: options.trackSampleInterval ?? 20,
    };

    // 绑定事件处理器的 this 上下文
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
  }

  /**
   * 初始化滑块
   *
   * 解析元素选择器并绑定事件监听器。
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    // 解析滑块元素
    if (typeof this.options.slider === "string") {
      this.sliderEl = document.querySelector(this.options.slider);
    } else {
      this.sliderEl = this.options.slider;
    }

    // 解析轨道元素
    if (typeof this.options.track === "string") {
      this.trackEl = document.querySelector(this.options.track);
    } else {
      this.trackEl = this.options.track;
    }

    // 检查元素是否存在
    if (!this.sliderEl) {
      console.error("[SliderClient] 滑块元素不存在");
      return;
    }

    if (!this.trackEl) {
      console.error("[SliderClient] 轨道元素不存在");
      return;
    }

    // 绑定鼠标事件
    this.sliderEl.addEventListener("mousedown", this.handleMouseDown);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);

    // 绑定触摸事件
    this.sliderEl.addEventListener("touchstart", this.handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchmove", this.handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", this.handleTouchEnd);

    // 设置滑块样式
    this.sliderEl.style.cursor = "grab";
    this.sliderEl.style.userSelect = "none";
    (this.sliderEl.style as unknown as Record<string, string>)
      .webkitUserSelect = "none";

    this.initialized = true;
  }

  /**
   * 销毁滑块
   *
   * 移除所有事件监听器。
   */
  destroy(): void {
    if (!this.initialized) {
      return;
    }

    if (this.sliderEl) {
      this.sliderEl.removeEventListener("mousedown", this.handleMouseDown);
      this.sliderEl.removeEventListener("touchstart", this.handleTouchStart);
    }

    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("touchmove", this.handleTouchMove);
    document.removeEventListener("touchend", this.handleTouchEnd);

    this.initialized = false;
  }

  /**
   * 重置滑块位置和轨迹
   */
  reset(): void {
    this.currentX = 0;
    this.currentY = 0;
    this.trackData = [];
    this.dragStartTime = 0;
    this.isVerifying = false;

    if (this.sliderEl) {
      this.sliderEl.style.transform = "translateX(0)";
    }
  }

  /**
   * 更新挑战 ID（用于重新获取挑战后）
   *
   * @param challengeId - 新的挑战 ID
   */
  setChallengeId(challengeId: string): void {
    this.options.challengeId = challengeId;
  }

  /**
   * 获取当前位置
   *
   * @returns 当前 X 坐标
   */
  getPosition(): number {
    return this.currentX;
  }

  /**
   * 获取验证数据
   *
   * @returns 验证数据
   */
  getVerifyData(): SliderVerifyData {
    const endTime = Date.now();
    return {
      x: this.currentX,
      track: this.trackData,
      startTime: this.dragStartTime,
      endTime,
      duration: this.dragStartTime > 0 ? endTime - this.dragStartTime : 0,
    };
  }

  /**
   * 获取轨迹数据
   *
   * @returns 轨迹数据
   */
  getTrack(): Array<[number, number, number]> {
    return this.trackData;
  }

  /**
   * 手动触发验证
   *
   * @returns 验证结果
   */
  verify(): Promise<SliderVerifyResult> {
    return this.sendVerifyRequest();
  }

  /**
   * 发送验证请求到服务端
   *
   * @returns 验证结果
   */
  private async sendVerifyRequest(): Promise<SliderVerifyResult> {
    if (!this.options.verifyUrl) {
      return { success: false, error: "未设置 verifyUrl" };
    }

    if (this.isVerifying) {
      return { success: false, error: "正在验证中" };
    }

    this.isVerifying = true;

    try {
      const data = this.getVerifyData();

      // 构建请求体
      const body = {
        id: this.options.challengeId,
        userInput: {
          x: data.x,
          track: data.track,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      };

      // 发送请求
      const response = await fetch(this.options.verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.options.headers,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: SliderVerifyResult = await response.json();

      if (result.success) {
        this.options.onVerified?.(result);
      } else {
        this.options.onError?.(result.error || "验证失败");
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "网络错误";
      this.options.onError?.(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.isVerifying = false;
    }
  }

  /**
   * 处理鼠标按下
   */
  private handleMouseDown(e: MouseEvent): void {
    if (this.isVerifying) return;
    e.preventDefault();
    this.startDrag(e.clientX, e.clientY);
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();
    this.moveDrag(e.clientX, e.clientY);
  }

  /**
   * 处理鼠标抬起
   */
  private handleMouseUp(): void {
    if (!this.isDragging) return;
    this.endDrag();
  }

  /**
   * 处理触摸开始
   */
  private handleTouchStart(e: TouchEvent): void {
    if (this.isVerifying) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
  }

  /**
   * 处理触摸移动
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.moveDrag(touch.clientX, touch.clientY);
  }

  /**
   * 处理触摸结束
   */
  private handleTouchEnd(): void {
    if (!this.isDragging) return;
    this.endDrag();
  }

  /**
   * 开始拖动
   *
   * @param clientX - 客户端 X 坐标
   * @param clientY - 客户端 Y 坐标
   */
  private startDrag(clientX: number, clientY: number): void {
    this.isDragging = true;
    this.startX = clientX;
    this.startY = clientY;
    this.sliderStartX = this.currentX;
    this.dragStartTime = Date.now();
    this.trackData = [];
    this.lastSampleTime = 0;

    // 记录起始点
    if (this.options.collectTrack) {
      this.recordTrackPoint(0, 0);
    }

    if (this.sliderEl) {
      this.sliderEl.style.cursor = "grabbing";
    }

    this.options.onStart?.();
  }

  /**
   * 移动拖动
   *
   * @param clientX - 客户端 X 坐标
   * @param clientY - 客户端 Y 坐标
   */
  private moveDrag(clientX: number, clientY: number): void {
    if (!this.trackEl || !this.sliderEl) return;

    // 计算移动距离
    const deltaX = clientX - this.startX;
    const deltaY = clientY - this.startY;
    let newX = this.sliderStartX + deltaX;

    // 获取轨道和滑块的尺寸
    const trackRect = this.trackEl.getBoundingClientRect();
    const sliderRect = this.sliderEl.getBoundingClientRect();

    // 限制在轨道范围内
    const maxX = trackRect.width - sliderRect.width;
    newX = Math.max(0, Math.min(newX, maxX));

    // 更新位置
    this.currentX = newX;
    this.currentY = deltaY;
    this.sliderEl.style.transform = `translateX(${newX}px)`;

    // 收集轨迹
    if (this.options.collectTrack) {
      const now = Date.now();
      if (now - this.lastSampleTime >= this.options.trackSampleInterval) {
        this.recordTrackPoint(newX, deltaY);
        this.lastSampleTime = now;
      }
    }

    this.options.onMove?.(newX, deltaY);
  }

  /**
   * 记录轨迹点
   *
   * @param x - X 坐标
   * @param y - Y 坐标
   */
  private recordTrackPoint(x: number, y: number): void {
    const timestamp = Date.now() - this.dragStartTime;
    this.trackData.push([x, y, timestamp]);
  }

  /**
   * 结束拖动
   */
  private endDrag(): void {
    this.isDragging = false;

    // 记录结束点
    if (this.options.collectTrack) {
      this.recordTrackPoint(this.currentX, this.currentY);
    }

    if (this.sliderEl) {
      this.sliderEl.style.cursor = "grab";
    }

    // 设置了 verifyUrl 则自动验证，否则调用 onEnd 回调
    if (this.options.verifyUrl) {
      this.sendVerifyRequest();
    } else {
      const verifyData = this.getVerifyData();
      this.options.onEnd?.(verifyData);
    }
  }
}

/**
 * 创建滑块客户端实例
 *
 * @param options - 配置选项
 * @returns 滑块客户端实例
 *
 * @example 基础用法（自动验证）
 * ```typescript
 * import { createSliderClient } from "@dreamer/humancheck/client/slider";
 *
 * const slider = createSliderClient({
 *   slider: "#handle",
 *   track: "#track",
 *   challengeId: "abc123",
 *   verifyUrl: "/api/humancheck/verify",
 *   onVerified: (result) => {
 *     console.log("验证通过！精确度:", result.accuracy);
 *     // 跳转或继续操作
 *   },
 *   onError: (error) => {
 *     console.log("验证失败:", error);
 *     // 重新获取挑战
 *     slider.reset();
 *     slider.setChallengeId(newChallengeId);
 *   },
 * });
 *
 * slider.init();
 * ```
 *
 * @example 手动验证（不设置 verifyUrl）
 * ```typescript
 * const slider = createSliderClient({
 *   slider: "#handle",
 *   track: "#track",
 *   challengeId: "abc123",
 *   // 不设置 verifyUrl，手动处理验证
 *   onEnd: (data) => {
 *     console.log("拖动结束，位置:", data.x);
 *     // 手动发送验证请求
 *     fetch("/api/verify", {
 *       method: "POST",
 *       body: JSON.stringify({ id: "abc123", ...data }),
 *     });
 *   },
 * });
 *
 * slider.init();
 * ```
 */
export function createSliderClient(options: SliderClientOptions): SliderClient {
  return new SliderClient(options);
}
