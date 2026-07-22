# 变更日志

@dreamer/humancheck 的所有重要变更均记录于此。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.1.0] - 2026-07-23

### 新增

- **Node.js 22+ 兼容**：通过 @dreamer/runtime-adapter v1.2.2（IS_NODE + 跨运行时
  getEnv/crypto/fetch API）实现。src 无需改动——全部代码已使用跨运行时 API
  （crypto.subtle、crypto.randomUUID、crypto.getRandomValues、btoa、fetch、
  TextEncoder、setInterval/setTimeout）。
- **test:node** 脚本（`tsx --test --test-force-exit tests/*.test.ts`），适配
  Node.js 22+ 测试运行器。
- **CI 工作流**（9 jobs）：3 Deno v2.9 + 3 Bun + 3 Node 22（Linux/macOS/Windows）。
- **tsconfig.json**：Node tsx 加载器配置。
- **minimumDependencyAge: 0**：deno.json 中新增，支持当天发布的 JSR 依赖解析。

### 变更

- 升级依赖：@dreamer/i18n ^1.1.2、@dreamer/runtime-adapter ^1.2.2、
  @dreamer/test ^1.2.3。
- package.json 中 `engines.node` 设为 `>=22`。

### 修复

- providers.test.ts：调用 `setHumancheckLocale("zh-CN")` 强制中文 locale，修复
  CI 英文 locale 下 i18n 错误文案断言不匹配的问题。

---

## [1.0.0] - 2026-02-19

首个稳定版本。为 Deno 与 Bun 提供完整的人机验证能力。

### 新增

#### 核心验证器

- **HumanCheck** 类及 `createHumanCheck()` 工厂函数，用于创建与验证挑战。
- 按类型名**注册**挑战：`register(type, challenge)`、`unregister(type)`。
- **create(challenge, options?)** 创建挑战，返回 `id` 与挑战
  `data`（如图片、题目、背景等）。
- **verify(id, input, challenge?)**
  验证用户输入；支持按挑战过期时间、最大尝试次数及按注册类型自动解析挑战。
- **cleanup()** 清理过期挑战记录。
- 可配置 **defaultExpiresIn**、**defaultMaxAttempts**、**maxRecords** 及可插拔
  **store**。

#### 图形验证码

- **ImageChallenge** 与
  `createImageChallenge()`，选项：`length`、`width`、`height`、`charset`、`caseSensitive`、`noiseLines`、`noiseDots`、`noiseArcs`、`textColors`。
- 基于 **SVG**
  的图片生成（无需图片库）；文字扭曲与波形变形；多种干扰（线条、弧、点）。
- **generate()** 返回验证码数据与答案；**verify()**
  使用常量时间比较校验用户输入。

#### 数学验证码

- **MathChallenge** 与
  `createMathChallenge()`，选项：`minNumber`、`maxNumber`、`operators`（`+`、`-`、`*`）、`asImage`。
- **generate()** 返回数学题与数值答案；**verify()** 接受数字或字符串输入。
- 可选以图片形式渲染数学表达式。

#### 滑块验证码

- **SliderChallenge** 与
  `createSliderChallenge()`，选项：`width`、`height`、`tolerance`、`validateTrack`、`validateTime`、`minDragTime`、`maxDragTime`、`minTrackPoints`。
- **SVG 背景**生成；在容差范围内校验位置。
- **轨迹分析**拒绝直线滑动（机器人）；**时间验证**拒绝过快或过慢拖动；**Y
  轴抖动**检测人类行为。
- **verify()** 接受 `{ x, startTime, endTime, track }` 载荷。

#### TOTP（基于时间的一次性密码）

- **Totp** 类与
  `createTotp()`，选项：`issuer`、`digits`、`period`、`algorithm`、`window`。
- **generateSecret(accountName)** 返回 Base32 **secret**、**qrCode** 与
  **otpauthUrl**，兼容 Google Authenticator。
- **generate(secret, timestamp?)** 与 **verify(secret, token, timestamp?)**
  支持可配置时间窗口；**getRemainingTime(timestamp?)** 便于前端展示剩余时间。
- 防重放与常量时间比较。

#### 存储

- **MemoryStore** 与 `createMemoryStore()`：**LRU 淘汰**（O(1)），可配置
  `maxRecords`、`cleanupInterval`。
- **Store** 接口支持自定义后端（如 Redis、KV），供 HumanCheck
  存储挑战与尝试状态。

#### 第三方服务提供者（服务端）

- **RecaptchaProvider** 与 `createRecaptchaProvider()`：**verify(token,
  options?)** 校验 Google reCAPTCHA
  v2/v3；`siteKey`、`secretKey`、`version`、`minScore`（v3）、`action`（v3）。
- **TurnstileProvider** 与 `createTurnstileProvider()`：**verify(token,
  options?)** 校验 Cloudflare Turnstile；`siteKey`、`secretKey`。
- **getSiteKey()** / **getVersion()**（Recaptcha）供前端组件使用。

#### 客户端模块（按需导入）

- **SliderClient**（`@dreamer/humancheck/client/slider`）：基于 DOM 的滑块
  UI，`verifyUrl`、`onVerified` 回调。
- **RecaptchaClient**（`@dreamer/humancheck/client/recaptcha`）：reCAPTCHA
  组件，`verifyUrl`、`onVerified`。
- **TurnstileClient**（`@dreamer/humancheck/client/turnstile`）：Turnstile
  组件，`verifyUrl`、`onVerified`。

#### 国际化（i18n）

- 服务端文案（挑战未注册、secretKey 必填等）提供 **en-US** 与 **zh-CN**，基于
  `@dreamer/i18n`。
- 语言由 `LANGUAGE` / `LC_ALL` / `LANG` 决定；包内导出
  **$tr**、**setHumancheckLocale**、**detectLocale** 便于自定义语言。
- 客户端模块暂不翻译。

#### 导出与类型

- 主入口导出：`createHumanCheck`、`HumanCheck`，各挑战工厂与类，`createTotp`、`Totp`，`createMemoryStore`、`MemoryStore`，`createRecaptchaProvider`、`RecaptchaProvider`，`createTurnstileProvider`、`TurnstileProvider`
  及相关类型。
- 子路径：`./client/slider`、`./client/recaptcha`、`./client/turnstile`
  便于仅使用客户端与 tree-shaking。

### 兼容性

- **Deno** 2.5+
- **Bun** 1.0+
- 服务端：验证码生成、答案校验、TOTP、第三方 token 校验。
- 客户端：滑块交互与第三方组件集成（浏览器）。

### 安全

- 验证码与 TOTP 使用常量时间比较。
- 滑块轨迹与时间校验降低机器人与脚本滥用。
- 最大尝试次数与挑战过期限制滥用。
- TOTP 时间窗口与防重放。

### 测试

- 共 109 个测试，覆盖 core、image、math、memory、slider、providers、totp；Deno
  与 Bun 下均 100% 通过。
- 详见 [TEST_REPORT.md](./TEST_REPORT.md)。
