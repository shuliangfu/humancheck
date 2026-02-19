# @dreamer/humancheck

> 📖 English | [中文文档](./docs/zh-CN/README.md)

> A human verification package for Deno and Bun: image/math/slider captcha,
> TOTP, and third-party integration.

[![JSR](https://jsr.io/badges/@dreamer/humancheck)](https://jsr.io/@dreamer/humancheck)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-109%20passed-brightgreen)](./docs/en-US/TEST_REPORT.md)

---

## Features

Human verification with multiple methods: bot protection, form submission
protection, and user identity verification.

---

## Installation

### Deno

```bash
deno add jsr:@dreamer/humancheck
```

### Bun

```bash
bunx jsr add @dreamer/humancheck
```

### Client (on-demand imports)

```typescript
// Slider captcha client
import { SliderClient } from "jsr:@dreamer/humancheck/client/slider";

// Google reCAPTCHA client
import { RecaptchaClient } from "jsr:@dreamer/humancheck/client/recaptcha";

// Cloudflare Turnstile client
import { TurnstileClient } from "jsr:@dreamer/humancheck/client/turnstile";
```

---

## Environment compatibility

| Environment | Version | Status                                                       |
| ----------- | ------- | ------------------------------------------------------------ |
| **Deno**    | 2.5+    | ✅ Fully supported                                           |
| **Bun**     | 1.0+    | ✅ Fully supported                                           |
| **Server**  | -       | ✅ Supported (captcha generation, answer verification, TOTP) |
| **Client**  | -       | ✅ Supported (slider interaction, third-party integration)   |

---

## Capabilities

- **Image captcha**:
  - SVG generation, no image library required
  - Multiple noise elements (lines, arcs, dots)
  - Text distortion and wave deformation
  - Custom colors, fonts, character set
  - Case-sensitive / case-insensitive options

- **Math captcha**:
  - Addition, subtraction, multiplication
  - Configurable number range
  - Text or image mode
  - Complex graphic noise

- **Slider captcha**:
  - SVG background generation
  - Position tolerance verification
  - Track analysis (bot detection)
  - Time verification (script detection)
  - Y-axis jitter detection

- **TOTP**:
  - Google Authenticator compatible
  - Base32 secret generation
  - QR code generation
  - Time window verification
  - Replay attack protection

- **Third-party integration**:
  - Google reCAPTCHA v2/v3
  - Cloudflare Turnstile
  - Client wrappers

- **Storage adapters**:
  - In-memory store (LRU eviction)
  - Extensible store interface

---

## Use cases

- **Login protection**: Prevent brute force
- **Registration**: Prevent bot sign-ups
- **Form submission**: Prevent spam
- **API protection**: Limit automated calls
- **2FA**: TOTP two-factor authentication
- **Sensitive actions**: Payment, password change, etc.

---

## Quick start

### Image captcha

```typescript
import {
  createHumanCheck,
  createImageChallenge,
} from "jsr:@dreamer/humancheck";

const humanCheck = createHumanCheck();

const imageChallenge = createImageChallenge({
  length: 4,
  width: 150,
  height: 50,
  caseSensitive: false,
});

const { id, data } = await humanCheck.create(imageChallenge);

// data.image is Base64-encoded SVG
// Send id and image to client

const result = await humanCheck.verify(id, userInput, imageChallenge);
if (result.success) {
  console.log("Verified!");
} else {
  console.log("Failed:", result.error);
}
```

### Math captcha

```typescript
import { createHumanCheck, createMathChallenge } from "jsr:@dreamer/humancheck";

const humanCheck = createHumanCheck();

const mathChallenge = createMathChallenge({
  minNumber: 1,
  maxNumber: 20,
  operators: ["+", "-"],
  asImage: true,
});

const { id, data } = await humanCheck.create(mathChallenge);
// data.image or data.question

const result = await humanCheck.verify(id, userAnswer, mathChallenge);
```

### Slider captcha

```typescript
import {
  createHumanCheck,
  createSliderChallenge,
} from "jsr:@dreamer/humancheck";

const humanCheck = createHumanCheck();

const sliderChallenge = createSliderChallenge({
  width: 300,
  height: 60,
  tolerance: 5,
  validateTrack: true,
  validateTime: true,
});

const { id, data } = await humanCheck.create(sliderChallenge);
// data.background, data.width, data.height

const result = await humanCheck.verify(id, {
  x: userX,
  startTime: dragStartTime,
  endTime: dragEndTime,
  track: trackData, // [[x, y, timestamp], ...]
}, sliderChallenge);
```

### TOTP

```typescript
import { createTotp } from "jsr:@dreamer/humancheck";

const totp = createTotp({
  issuer: "MyApp",
  digits: 6,
  period: 30,
});

const { secret, qrCode, otpauthUrl } = totp.generateSecret("user@example.com");
// Show qrCode to user

const result = await totp.verify(secret, userCode);
if (result.success) {
  console.log("TOTP verified!");
}
```

---

## Examples

### Register challenge types

```typescript
import {
  createHumanCheck,
  createImageChallenge,
  createMathChallenge,
} from "jsr:@dreamer/humancheck";

const humanCheck = createHumanCheck();

humanCheck.register("image", createImageChallenge());
humanCheck.register("math", createMathChallenge());

const { id, data } = await humanCheck.create("image");

const result = await humanCheck.verify(id, userInput);
```

### Client slider

```typescript
import { SliderClient } from "jsr:@dreamer/humancheck/client/slider";

const slider = new SliderClient({
  container: document.getElementById("slider-container")!,
  background: serverData.background,
  width: serverData.width,
  height: serverData.height,
  verifyUrl: "/api/verify-slider",
  onVerified: (result) => {
    if (result.success) {
      console.log("Verified!");
    }
  },
});

slider.init();
```

### Client reCAPTCHA

```typescript
import { RecaptchaClient } from "jsr:@dreamer/humancheck/client/recaptcha";

const recaptcha = new RecaptchaClient({
  siteKey: "your-site-key",
  container: document.getElementById("recaptcha-container")!,
  verifyUrl: "/api/verify-recaptcha",
  onVerified: (result) => {
    if (result.success) {
      console.log("reCAPTCHA verified!");
    }
  },
});

await recaptcha.load();
recaptcha.render();
```

### Server-side third-party token verification

```typescript
import {
  createRecaptchaProvider,
  createTurnstileProvider,
} from "jsr:@dreamer/humancheck";

const recaptcha = createRecaptchaProvider({
  siteKey: "your-site-key",
  secretKey: "your-secret-key",
  version: "v2",
});

app.post("/api/verify-recaptcha", async (req) => {
  const { token } = await req.json();
  const result = await recaptcha.verify(token, {
    remoteip: req.headers.get("x-forwarded-for"),
  });
  return Response.json(result);
});

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

### Custom storage

```typescript
import { createHumanCheck, createMemoryStore } from "jsr:@dreamer/humancheck";

const store = createMemoryStore({
  maxRecords: 5000,
  cleanupInterval: 60000,
});

const humanCheck = createHumanCheck({
  store,
  defaultExpiresIn: 300,
  defaultMaxAttempts: 5,
});
```

---

## API reference

### HumanCheck

Core verifier for creating and verifying challenges.

**Constructor options**:

| Option               | Type     | Default       | Description           |
| -------------------- | -------- | ------------- | --------------------- |
| `store`              | `Store`  | `MemoryStore` | Storage adapter       |
| `defaultExpiresIn`   | `number` | `300`         | Default TTL (seconds) |
| `defaultMaxAttempts` | `number` | `5`           | Default max attempts  |
| `maxRecords`         | `number` | `10000`       | Max records           |

**Methods**:

| Method                          | Description               |
| ------------------------------- | ------------------------- |
| `register(type, challenge)`     | Register challenge type   |
| `unregister(type)`              | Unregister challenge type |
| `create(challenge, options?)`   | Create challenge          |
| `verify(id, input, challenge?)` | Verify challenge          |
| `cleanup()`                     | Clean expired records     |

### ImageChallenge

| Option          | Type       | Default    | Description    |
| --------------- | ---------- | ---------- | -------------- |
| `length`        | `number`   | `4`        | Code length    |
| `width`         | `number`   | `150`      | Image width    |
| `height`        | `number`   | `50`       | Image height   |
| `charset`       | `string`   | `A-Z0-9`   | Character set  |
| `caseSensitive` | `boolean`  | `false`    | Case sensitive |
| `noiseLines`    | `number`   | `6`        | Noise lines    |
| `noiseDots`     | `number`   | `30`       | Noise dots     |
| `noiseArcs`     | `number`   | `3`        | Noise arcs     |
| `textColors`    | `string[]` | `"random"` | Text colors    |

### MathChallenge

| Option      | Type                       | Default      | Description     |
| ----------- | -------------------------- | ------------ | --------------- |
| `minNumber` | `number`                   | `1`          | Min number      |
| `maxNumber` | `number`                   | `20`         | Max number      |
| `operators` | `Array<"+" \| "-" \| "*">` | `["+", "-"]` | Operators       |
| `asImage`   | `boolean`                  | `false`      | Render as image |

### SliderChallenge

| Option           | Type      | Default | Description        |
| ---------------- | --------- | ------- | ------------------ |
| `width`          | `number`  | `300`   | Width              |
| `height`         | `number`  | `60`    | Height             |
| `tolerance`      | `number`  | `5`     | Tolerance (px)     |
| `validateTrack`  | `boolean` | `true`  | Validate track     |
| `validateTime`   | `boolean` | `true`  | Validate time      |
| `minDragTime`    | `number`  | `200`   | Min drag time (ms) |
| `maxDragTime`    | `number`  | `10000` | Max drag time (ms) |
| `minTrackPoints` | `number`  | `5`     | Min track points   |

### Totp

| Option      | Type     | Default        | Description      |
| ----------- | -------- | -------------- | ---------------- |
| `issuer`    | `string` | `"HumanCheck"` | Issuer name      |
| `digits`    | `number` | `6`            | Code digits      |
| `period`    | `number` | `30`           | Period (seconds) |
| `algorithm` | `string` | `"SHA1"`       | Hash algorithm   |
| `window`    | `number` | `1`            | Time window      |

**Methods**: `generateSecret(accountName)`, `generate(secret, timestamp?)`,
`verify(secret, token, timestamp?)`, `getRemainingTime(timestamp?)`.

### MemoryStore

| Option            | Type     | Default | Description           |
| ----------------- | -------- | ------- | --------------------- |
| `maxRecords`      | `number` | `10000` | Max records           |
| `cleanupInterval` | `number` | `60000` | Cleanup interval (ms) |

### RecaptchaProvider

| Option      | Type           | Default | Description          |
| ----------- | -------------- | ------- | -------------------- |
| `siteKey`   | `string`       | -       | Site key (client)    |
| `secretKey` | `string`       | -       | Secret key (server)  |
| `version`   | `"v2" \| "v3"` | `"v2"`  | reCAPTCHA version    |
| `minScore`  | `number`       | `0.5`   | Min score (v3)       |
| `action`    | `string`       | -       | Expected action (v3) |

**Methods**: `verify(token, options?)`, `getSiteKey()`, `getVersion()`.

### TurnstileProvider

| Option      | Type     | Default | Description         |
| ----------- | -------- | ------- | ------------------- |
| `siteKey`   | `string` | -       | Site key (client)   |
| `secretKey` | `string` | -       | Secret key (server) |

**Methods**: `verify(token, options?)`, `getSiteKey()`.

---

## Performance

- **LRU eviction**: MemoryStore O(1) eviction
- **Secret caching**: TOTP caches Base32 decode
- **Shared utilities**: Less duplication
- **Tree-shaking**: Client modules exported separately

---

## Security

| Feature                   | Description                     |
| ------------------------- | ------------------------------- |
| **Track analysis**        | Detect bot-like straight slides |
| **Time checks**           | Detect too fast/slow scripts    |
| **Y-axis jitter**         | Detect human-like jitter        |
| **Replay protection**     | TOTP codes single-use           |
| **Constant-time compare** | Mitigate timing attacks         |
| **Attempt limits**        | Mitigate brute force            |

---

## Test report

| Metric      | Value         |
| ----------- | ------------- |
| Date        | 2026-02-01    |
| Total tests | 109           |
| Pass rate   | 100%          |
| Framework   | @dreamer/test |

See [TEST_REPORT.md](./docs/en-US/TEST_REPORT.md) for details.

---

## Documentation

- **Full (中文)**: [docs/zh-CN/README.md](./docs/zh-CN/README.md)
- **Test (EN)**: [docs/en-US/TEST_REPORT.md](./docs/en-US/TEST_REPORT.md) ·
  **Test (中文)**: [docs/zh-CN/TEST_REPORT.md](./docs/zh-CN/TEST_REPORT.md)

---

## Changelog

### [1.0.0] - 2026-02-19

- **Added**: Initial release. Core verifier (HumanCheck), image/math/slider
  captcha, TOTP, MemoryStore (LRU), RecaptchaProvider (v2/v3),
  TurnstileProvider, client modules (SliderClient, RecaptchaClient,
  TurnstileClient), i18n (en-US / zh-CN).
- **Compatibility**: Deno 2.5+, Bun 1.0+.

Full history: [docs/en-US/CHANGELOG.md](./docs/en-US/CHANGELOG.md).

---

## Notes

- **Server vs client**: Server API from `@dreamer/humancheck`, client from
  subpaths as needed
- **Storage**: In production set appropriate `cleanupInterval` and `maxRecords`
- **TOTP secrets**: Store securely, do not send in plain text
- **Third-party**: Register on reCAPTCHA/Turnstile to get keys
- **Track validation**: May affect mobile UX; test before enabling

---

## Contributing

Issues and Pull Requests welcome.

---

## License

Apache License 2.0 — see [LICENSE](./LICENSE)

---

<div align="center">**Made with ❤️ by Dreamer Team**</div>
