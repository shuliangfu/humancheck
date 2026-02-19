# @dreamer/humancheck

> 📖 [English](../../README.md) | 中文

> 一个兼容 Deno 和 Bun
> 的人机验证包，支持图形验证码、数学验证码、滑块验证码、TOTP、第三方服务集成

[![JSR](https://jsr.io/badges/@dreamer/humancheck)](https://jsr.io/@dreamer/humancheck)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](../../LICENSE)
[![Tests](https://img.shields.io/badge/tests-109%20passed-brightgreen)](./TEST_REPORT.md)

---

## 🎯 功能

人机验证包，提供多种验证方式，用于防止机器人、保护表单提交、用户身份验证等场景。

---

## 📦 安装

### Deno

```bash
deno add jsr:@dreamer/humancheck
```

### Bun

```bash
bunx jsr add @dreamer/humancheck
```

### 客户端（按需导入）

```typescript
// 滑块验证客户端
import { SliderClient } from "jsr:@dreamer/humancheck/client/slider";

// Google reCAPTCHA 客户端
import { RecaptchaClient } from "jsr:@dreamer/humancheck/client/recaptcha";

// Cloudflare Turnstile 客户端
import { TurnstileClient } from "jsr:@dreamer/humancheck/client/turnstile";
```

---

## 🌍 环境兼容性

| 环境       | 版本要求 | 状态                                  |
| ---------- | -------- | ------------------------------------- |
| **Deno**   | 2.5+     | ✅ 完全支持                           |
| **Bun**    | 1.0+     | ✅ 完全支持                           |
| **服务端** | -        | ✅ 支持（验证码生成、答案验证、TOTP） |
| **客户端** | -        | ✅ 支持（滑块交互、第三方服务集成）   |

---

## ✨ 特性

- **图形验证码**：
  - SVG 生成，无需图片库
  - 多种干扰元素（线条、圆弧、点）
  - 文字扭曲和波形变形
  - 自定义颜色、字体、字符集
  - 大小写敏感/不敏感配置

- **数学验证码**：
  - 支持加减乘运算
  - 可配置数字范围
  - 文本或图片模式
  - 复杂图形干扰

- **滑块验证码**：
  - SVG 背景生成
  - 位置容差验证
  - 轨迹分析（防机器人）
  - 时间验证（防脚本）
  - Y 轴抖动检测

- **TOTP 验证器**：
  - Google Authenticator 兼容
  - Base32 密钥生成
  - QR 码生成
  - 时间窗口验证
  - 防重放攻击保护

- **第三方服务集成**：
  - Google reCAPTCHA v2/v3
  - Cloudflare Turnstile
  - 客户端封装

- **存储适配器**：
  - 内存存储（LRU 淘汰）
  - 可扩展存储接口

---

## 🎯 使用场景

- **登录保护**：防止暴力破解
- **注册验证**：防止机器人注册
- **表单提交**：防止垃圾信息
- **API 保护**：限制自动化调用
- **二次验证**：TOTP 双因素认证
- **敏感操作**：支付、修改密码等

---

## 🚀 快速开始

### 图形验证码

```typescript
import {
  createHumanCheck,
  createImageChallenge,
} from "jsr:@dreamer/humancheck";

// 创建验证器
const humanCheck = createHumanCheck();

// 创建图形验证码挑战
const imageChallenge = createImageChallenge({
  length: 4,
  width: 150,
  height: 50,
  caseSensitive: false,
});

// 生成挑战
const { id, data } = await humanCheck.create(imageChallenge);

// data.image 是 Base64 编码的 SVG 图片
// 将 id 和 image 发送给客户端

// 验证用户输入
const result = await humanCheck.verify(id, userInput, imageChallenge);
if (result.success) {
  console.log("验证通过！");
} else {
  console.log("验证失败：", result.error);
}
```

### 数学验证码

```typescript
import { createHumanCheck, createMathChallenge } from "jsr:@dreamer/humancheck";

const humanCheck = createHumanCheck();

// 创建数学验证码
const mathChallenge = createMathChallenge({
  minNumber: 1,
  maxNumber: 20,
  operators: ["+", "-"],
  asImage: true, // 以图片形式显示
});

const { id, data } = await humanCheck.create(mathChallenge);
// data.image 或 data.question

// 验证答案
const result = await humanCheck.verify(id, userAnswer, mathChallenge);
```

### 滑块验证码

```typescript
import {
  createHumanCheck,
  createSliderChallenge,
} from "jsr:@dreamer/humancheck";

const humanCheck = createHumanCheck();

// 创建滑块验证码
const sliderChallenge = createSliderChallenge({
  width: 300,
  height: 60,
  tolerance: 5,
  validateTrack: true, // 启用轨迹验证
  validateTime: true, // 启用时间验证
});

const { id, data } = await humanCheck.create(sliderChallenge);
// data.background 是背景图片
// data.width, data.height 是尺寸

// 验证滑动结果
const result = await humanCheck.verify(id, {
  x: userX, // 用户滑动的 X 坐标
  startTime: dragStartTime,
  endTime: dragEndTime,
  track: trackData, // [[x, y, timestamp], ...]
}, sliderChallenge);
```

### TOTP 验证

```typescript
import { createTotp } from "jsr:@dreamer/humancheck";

const totp = createTotp({
  issuer: "MyApp",
  digits: 6,
  period: 30,
});

// 为用户生成密钥
const { secret, qrCode, otpauthUrl } = totp.generateSecret("user@example.com");
// 将 qrCode 展示给用户扫描

// 验证用户输入的验证码
const result = await totp.verify(secret, userCode);
if (result.success) {
  console.log("TOTP 验证通过！");
}
```

---

## 🎨 使用示例

### 注册挑战类型

```typescript
import {
  createHumanCheck,
  createImageChallenge,
  createMathChallenge,
} from "jsr:@dreamer/humancheck";

const humanCheck = createHumanCheck();

// 注册挑战类型
humanCheck.register("image", createImageChallenge());
humanCheck.register("math", createMathChallenge());

// 通过类型名创建挑战
const { id, data } = await humanCheck.create("image");

// 验证时自动查找对应的挑战类型
const result = await humanCheck.verify(id, userInput);
```

### 客户端滑块交互

```typescript
import { SliderClient } from "jsr:@dreamer/humancheck/client/slider";

const slider = new SliderClient({
  container: document.getElementById("slider-container")!,
  background: serverData.background,
  width: serverData.width,
  height: serverData.height,
  verifyUrl: "/api/verify-slider", // 自动发送验证请求
  onVerified: (result) => {
    if (result.success) {
      console.log("验证成功！");
    }
  },
});

slider.init();
```

### 客户端 reCAPTCHA

```typescript
import { RecaptchaClient } from "jsr:@dreamer/humancheck/client/recaptcha";

const recaptcha = new RecaptchaClient({
  siteKey: "your-site-key",
  container: document.getElementById("recaptcha-container")!,
  verifyUrl: "/api/verify-recaptcha",
  onVerified: (result) => {
    if (result.success) {
      console.log("reCAPTCHA 验证成功！");
    }
  },
});

await recaptcha.load();
recaptcha.render();
```

### 服务端验证第三方 token

```typescript
import {
  createRecaptchaProvider,
  createTurnstileProvider,
} from "jsr:@dreamer/humancheck";

// reCAPTCHA 服务端验证
const recaptcha = createRecaptchaProvider({
  siteKey: "your-site-key",
  secretKey: "your-secret-key",
  version: "v2",
});

// 在 API 路由中验证
app.post("/api/verify-recaptcha", async (req) => {
  const { token } = await req.json();
  const result = await recaptcha.verify(token, {
    remoteip: req.headers.get("x-forwarded-for"),
  });
  return Response.json(result);
});

// Turnstile 服务端验证
const turnstile = createTurnstileProvider({
  siteKey: "your-site-key",
  secretKey: "your-secret-key",
});

app.post("/api/verify-turnstile", async (req) => {
  const { token } = await req.json();
  const result = await turnstile.verify(token);
  return Response.json(result);
});
```

### 自定义存储

```typescript
import { createHumanCheck, createMemoryStore } from "jsr:@dreamer/humancheck";

// 创建带容量限制的存储
const store = createMemoryStore({
  maxRecords: 5000,
  cleanupInterval: 60000, // 每分钟清理
});

const humanCheck = createHumanCheck({
  store,
  defaultExpiresIn: 300, // 5 分钟过期
  defaultMaxAttempts: 5,
});
```

---

## 📚 API 文档

### HumanCheck 类

核心验证器，管理挑战的创建和验证。

**构造函数选项**：

| 参数                 | 类型     | 默认值        | 说明               |
| -------------------- | -------- | ------------- | ------------------ |
| `store`              | `Store`  | `MemoryStore` | 存储适配器         |
| `defaultExpiresIn`   | `number` | `300`         | 默认过期时间（秒） |
| `defaultMaxAttempts` | `number` | `5`           | 默认最大尝试次数   |
| `maxRecords`         | `number` | `10000`       | 最大记录数         |

**方法**：

| 方法                            | 说明             |
| ------------------------------- | ---------------- |
| `register(type, challenge)`     | 注册挑战类型     |
| `unregister(type)`              | 取消注册挑战类型 |
| `create(challenge, options?)`   | 创建挑战         |
| `verify(id, input, challenge?)` | 验证挑战         |
| `cleanup()`                     | 清理过期记录     |

### ImageChallenge

图形验证码挑战。

**选项**：

| 参数            | 类型       | 默认值     | 说明       |
| --------------- | ---------- | ---------- | ---------- |
| `length`        | `number`   | `4`        | 验证码长度 |
| `width`         | `number`   | `150`      | 图片宽度   |
| `height`        | `number`   | `50`       | 图片高度   |
| `charset`       | `string`   | `A-Z0-9`   | 字符集     |
| `caseSensitive` | `boolean`  | `false`    | 大小写敏感 |
| `noiseLines`    | `number`   | `6`        | 干扰线数量 |
| `noiseDots`     | `number`   | `30`       | 干扰点数量 |
| `noiseArcs`     | `number`   | `3`        | 干扰弧数量 |
| `textColors`    | `string[]` | `"random"` | 文字颜色   |

### MathChallenge

数学验证码挑战。

**选项**：

| 参数        | 类型                       | 默认值       | 说明           |
| ----------- | -------------------------- | ------------ | -------------- |
| `minNumber` | `number`                   | `1`          | 最小数字       |
| `maxNumber` | `number`                   | `20`         | 最大数字       |
| `operators` | `Array<"+" \| "-" \| "*">` | `["+", "-"]` | 运算符         |
| `asImage`   | `boolean`                  | `false`      | 是否以图片形式 |

### SliderChallenge

滑块验证码挑战。

**选项**：

| 参数             | 类型      | 默认值  | 说明                 |
| ---------------- | --------- | ------- | -------------------- |
| `width`          | `number`  | `300`   | 宽度                 |
| `height`         | `number`  | `60`    | 高度                 |
| `tolerance`      | `number`  | `5`     | 容差（像素）         |
| `validateTrack`  | `boolean` | `true`  | 启用轨迹验证         |
| `validateTime`   | `boolean` | `true`  | 启用时间验证         |
| `minDragTime`    | `number`  | `200`   | 最小拖动时间（毫秒） |
| `maxDragTime`    | `number`  | `10000` | 最大拖动时间（毫秒） |
| `minTrackPoints` | `number`  | `5`     | 最小轨迹点数         |

### Totp

TOTP 验证器。

**选项**：

| 参数        | 类型     | 默认值         | 说明           |
| ----------- | -------- | -------------- | -------------- |
| `issuer`    | `string` | `"HumanCheck"` | 发行者名称     |
| `digits`    | `number` | `6`            | 验证码位数     |
| `period`    | `number` | `30`           | 时间周期（秒） |
| `algorithm` | `string` | `"SHA1"`       | 哈希算法       |
| `window`    | `number` | `1`            | 时间窗口       |

**方法**：

| 方法                                | 说明             |
| ----------------------------------- | ---------------- |
| `generateSecret(accountName)`       | 生成密钥和 QR 码 |
| `generate(secret, timestamp?)`      | 生成验证码       |
| `verify(secret, token, timestamp?)` | 验证验证码       |
| `getRemainingTime(timestamp?)`      | 获取剩余有效时间 |

### MemoryStore

内存存储适配器。

**选项**：

| 参数              | 类型     | 默认值  | 说明             |
| ----------------- | -------- | ------- | ---------------- |
| `maxRecords`      | `number` | `10000` | 最大记录数       |
| `cleanupInterval` | `number` | `60000` | 清理间隔（毫秒） |

### RecaptchaProvider

Google reCAPTCHA 服务端验证提供者。

**选项**：

| 参数        | 类型           | 默认值 | 说明                    |
| ----------- | -------------- | ------ | ----------------------- |
| `siteKey`   | `string`       | -      | 站点密钥（客户端使用）  |
| `secretKey` | `string`       | -      | 私钥（服务端使用）      |
| `version`   | `"v2" \| "v3"` | `"v2"` | reCAPTCHA 版本          |
| `minScore`  | `number`       | `0.5`  | 最低分数阈值（v3 专用） |
| `action`    | `string`       | -      | 预期动作（v3 专用）     |

**方法**：

| 方法                      | 说明         |
| ------------------------- | ------------ |
| `verify(token, options?)` | 验证 token   |
| `getSiteKey()`            | 获取站点密钥 |
| `getVersion()`            | 获取版本     |

### TurnstileProvider

Cloudflare Turnstile 服务端验证提供者。

**选项**：

| 参数        | 类型     | 默认值 | 说明                   |
| ----------- | -------- | ------ | ---------------------- |
| `siteKey`   | `string` | -      | 站点密钥（客户端使用） |
| `secretKey` | `string` | -      | 私钥（服务端使用）     |

**方法**：

| 方法                      | 说明         |
| ------------------------- | ------------ |
| `verify(token, options?)` | 验证 token   |
| `getSiteKey()`            | 获取站点密钥 |

---

## ⚡ 性能优化

- **LRU 淘汰**：MemoryStore 使用双向链表实现 O(1) 淘汰
- **密钥缓存**：TOTP 缓存 Base32 解码结果
- **公共工具**：统一的工具模块减少代码重复
- **按需加载**：客户端模块分开导出，支持 tree-shaking

---

## 🔒 安全特性

| 特性             | 说明                    |
| ---------------- | ----------------------- |
| **轨迹分析**     | 检测机器人直线滑动行为  |
| **时间验证**     | 检测脚本过快/过慢操作   |
| **Y 轴抖动**     | 检测人类自然手抖        |
| **防重放**       | TOTP 验证码不可重复使用 |
| **常量时间比较** | 防止时序攻击            |
| **尝试次数限制** | 防止暴力破解            |

---

## 📊 测试报告

| 指标     | 值            |
| -------- | ------------- |
| 测试时间 | 2026-02-01    |
| 总测试数 | 109           |
| 通过率   | 100%          |
| 测试框架 | @dreamer/test |

详细测试报告请查看 [TEST_REPORT.md](./TEST_REPORT.md)。

---

## 变更日志

### [1.0.0] - 2026-02-19

- **新增**：初始版本。核心验证器（HumanCheck）、图形/数学/滑块验证码、TOTP、MemoryStore（LRU）、RecaptchaProvider（v2/v3）、TurnstileProvider、客户端模块（SliderClient、RecaptchaClient、TurnstileClient）、i18n（en-US
  / zh-CN）。
- **兼容性**：Deno 2.5+、Bun 1.0+。

完整历史：[CHANGELOG.md](./CHANGELOG.md)。

---

## 📝 注意事项

- **服务端和客户端分离**：服务端代码在
  `@dreamer/humancheck`，客户端代码按需从子路径导入
- **存储清理**：生产环境建议配置合适的 `cleanupInterval` 和 `maxRecords`
- **TOTP 密钥保护**：密钥应安全存储，不应明文传输
- **第三方服务**：使用 reCAPTCHA/Turnstile 需要在对应平台注册获取密钥
- **轨迹验证**：启用轨迹验证可能影响移动端用户体验，建议测试后使用

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](../../LICENSE)

---

<div align="center">

**Made with ❤️ by Dreamer Team**

</div>
