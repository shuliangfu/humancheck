# Changelog

All notable changes to @dreamer/humancheck are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-07-23

### Added

- **Node.js 22+ compatibility** via @dreamer/runtime-adapter v1.2.2 (IS_NODE +
  cross-runtime getEnv/crypto/fetch APIs). No src changes needed — all code
  already uses cross-runtime APIs (crypto.subtle, crypto.randomUUID,
  crypto.getRandomValues, btoa, fetch, TextEncoder, setInterval/setTimeout).
- **test:node** script (`tsx --test --test-force-exit tests/*.test.ts`) for
  Node.js 22+ test runner.
- **CI workflow** (9 jobs): 3 Deno v2.9 + 3 Bun + 3 Node 22 (Linux/macOS/Windows).
- **tsconfig.json** for Node tsx loader.
- **minimumDependencyAge: 0** in deno.json for same-day JSR dependency resolution.

### Changed

- Upgraded dependencies: @dreamer/i18n ^1.1.2, @dreamer/runtime-adapter ^1.2.2,
  @dreamer/test ^1.2.3.
- `engines.node` set to `>=22` in package.json.

### Fixed

- providers.test.ts: call `setHumancheckLocale("zh-CN")` to force Chinese locale,
  fixing CI English locale mismatch on i18n error message assertions.

---

## [1.0.0] - 2026-02-19

Initial stable release. Full human verification toolkit for Deno and Bun.

### Added

#### Core verifier

- **HumanCheck** class and `createHumanCheck()` factory for creating and
  verifying challenges.
- Challenge **registration** by type name: `register(type, challenge)`,
  `unregister(type)`.
- **create(challenge, options?)** to create a challenge; returns `id` and
  challenge `data` (e.g. image, question, background).
- **verify(id, input, challenge?)** to verify user input; supports per-challenge
  expiry, max attempts, and automatic challenge resolution by registered type.
- **cleanup()** to remove expired challenge records.
- Configurable **defaultExpiresIn**, **defaultMaxAttempts**, **maxRecords**, and
  pluggable **store**.

#### Image captcha

- **ImageChallenge** and `createImageChallenge()` with options: `length`,
  `width`, `height`, `charset`, `caseSensitive`, `noiseLines`, `noiseDots`,
  `noiseArcs`, `textColors`.
- **SVG-based** image generation (no image library); text distortion and wave
  deformation; multiple noise elements (lines, arcs, dots).
- **generate()** returns captcha data and answer; **verify()** compares user
  input with constant-time comparison.

#### Math captcha

- **MathChallenge** and `createMathChallenge()` with options: `minNumber`,
  `maxNumber`, `operators` (`+`, `-`, `*`), `asImage`.
- **generate()** returns math question and numeric answer; **verify()** accepts
  numeric or string input.
- Optional image-mode rendering for the math expression.

#### Slider captcha

- **SliderChallenge** and `createSliderChallenge()` with options: `width`,
  `height`, `tolerance`, `validateTrack`, `validateTime`, `minDragTime`,
  `maxDragTime`, `minTrackPoints`.
- **SVG background** generation; position verification within tolerance.
- **Track analysis** to reject straight-line (bot-like) slides; **time
  validation** to reject too fast or too slow drags; **Y-axis jitter** detection
  for human-like behavior.
- **verify()** accepts `{ x, startTime, endTime, track }` payload.

#### TOTP (time-based one-time password)

- **Totp** class and `createTotp()` with options: `issuer`, `digits`, `period`,
  `algorithm`, `window`.
- **generateSecret(accountName)** returns `secret` (Base32), `qrCode`, and
  `otpauthUrl` for Google Authenticator.
- **generate(secret, timestamp?)** and **verify(secret, token, timestamp?)**
  with configurable time window; **getRemainingTime(timestamp?)** for UX.
- Replay protection and constant-time comparison.

#### Storage

- **MemoryStore** and `createMemoryStore()` with **LRU eviction** (O(1)),
  configurable `maxRecords` and `cleanupInterval`.
- **Store** interface for custom backends (e.g. Redis, KV); used by HumanCheck
  for challenge and attempt state.

#### Third-party providers (server-side)

- **RecaptchaProvider** and `createRecaptchaProvider()`: **verify(token,
  options?)** for Google reCAPTCHA v2/v3; `siteKey`, `secretKey`, `version`,
  `minScore` (v3), `action` (v3).
- **TurnstileProvider** and `createTurnstileProvider()`: **verify(token,
  options?)** for Cloudflare Turnstile; `siteKey`, `secretKey`.
- **getSiteKey()** / **getVersion()** (Recaptcha) for use with client widgets.

#### Client modules (on-demand imports)

- **SliderClient** from `@dreamer/humancheck/client/slider`: DOM-based slider
  UI, `verifyUrl`, `onVerified` callback.
- **RecaptchaClient** from `@dreamer/humancheck/client/recaptcha`: reCAPTCHA
  widget, `verifyUrl`, `onVerified`.
- **TurnstileClient** from `@dreamer/humancheck/client/turnstile`: Turnstile
  widget, `verifyUrl`, `onVerified`.

#### Internationalization (i18n)

- Server-side messages (challenge not registered, secretKey required, etc.) in
  **en-US** and **zh-CN** via `@dreamer/i18n`.
- Locale from `LANGUAGE` / `LC_ALL` / `LANG`; **$tr**, **setHumancheckLocale**,
  **detectLocale** exported from package for custom locale.
- Client modules remain untranslated.

#### Exports and types

- Main entry exports: `createHumanCheck`, `HumanCheck`, challenge factories and
  classes, `createTotp`, `Totp`, `createMemoryStore`, `MemoryStore`,
  `createRecaptchaProvider`, `RecaptchaProvider`, `createTurnstileProvider`,
  `TurnstileProvider`, and related types.
- Subpaths: `./client/slider`, `./client/recaptcha`, `./client/turnstile` for
  client-only usage and tree-shaking.

### Compatibility

- **Deno** 2.5+
- **Bun** 1.0+
- Server: captcha generation, answer verification, TOTP, third-party token
  verification.
- Client: slider interaction and third-party widget integration (browser).

### Security

- Constant-time comparison for captcha and TOTP verification.
- Slider track and time checks to reduce bots and scripts.
- Max attempts and challenge expiry to limit abuse.
- TOTP time-window and replay protection.

### Tests

- 109 tests across core, image, math, memory, slider, providers, and totp; 100%
  pass rate with Deno and Bun.
- See [TEST_REPORT.md](./TEST_REPORT.md) for details.
