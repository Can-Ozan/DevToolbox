# DevToolbox v2.0

**Essential developer tools. Fast, private, and local.**

A focused collection of 20 everyday developer utilities, built with React and TypeScript. Everything runs in the browser. No account, database, backend, analytics, or external API is required.

## Features

- Useful dashboard with favorites, recent tools, and suggested starting points
- Search by tool name, category, description, or keyword
- Accessible command palette: **Ctrl/Cmd + K**, arrow keys, Enter, Escape
- Persistent light, dark, and system themes
- Collapsible desktop navigation and a mobile navigation drawer
- Local favorites and the last 10 unique tools visited
- Reusable editors, clipboard feedback, inline errors, and confirmation dialogs
- Lazy-loaded tools, strict TypeScript, and a central tool registry
- Regex evaluation in a terminable worker with a one-second time limit

## Available tools

| Tool                     | Capabilities                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| JSON Formatter           | Format, minify, validate, choose indentation, copy, download JSON, counts, parser errors    |
| Base64 Encoder / Decoder | Unicode-safe UTF-8 encoding and decoding, swap, copy, clear                                 |
| UUID Generator           | Secure UUID v4; batches of 1, 5, 10, 25, 50, or 100; individual and batch copying           |
| JWT Decoder              | JSON header and payload, standard claims, local dates, raw signature inspection             |
| URL Encoder / Decoder    | Full URL or component encoding, decoding, swap, copy, clear                                 |
| Unix Timestamp Converter | Seconds and milliseconds, local date input, UTC, ISO 8601, current time                     |
| Hash Generator           | Native Web Crypto SHA-1, SHA-256, SHA-384, SHA-512                                          |
| Regex Tester             | Live matches, highlighting, values, indices, numbered/named captures, g/i/m/s/u/y flags     |
| Password Generator       | Secure 8–128 character passwords, selectable character pools, ambiguous-character exclusion |
| Color Converter          | HEX, RGB, HSL, live updates, validation, native color picker                                |
| Lorem Ipsum Generator    | Exact paragraph, sentence, or word quantities, copy, clear                                  |
| Text Diff Checker        | Line-level additions and removals, side-by-side and unified views, whitespace differences   |

### New in v2.0

| Tool                    | Capabilities                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| JSON ↔ YAML Converter   | Two-way conversion, validation, formatted JSON, copy, swap direction, JSON/YAML downloads            |
| Markdown Previewer      | Live split-pane GitHub-style Markdown, tables, task lists, embedded images, copy, Markdown download  |
| Cron Expression Builder | Five-field visual builder, intervals, lists/ranges, seven presets, descriptions, copy, reset         |
| QR Code Generator       | Local text/URL QR codes, size and correction controls, PNG download                                  |
| Case Converter          | Ten simultaneous case formats, Unicode-aware word splitting, individual/batch copying                |
| Number Base Converter   | Exact BigInt binary, octal, decimal, hexadecimal conversion, signed integers, validation             |
| Color Contrast Checker  | sRGB contrast ratio, previews, WCAG AA/AAA checks for normal and large text                          |
| URL Parser              | Native URL components, duplicate query parameters, credential redaction, individual and JSON copying |

JWT decoding **does not verify the signature or authenticity**. Password strength is a general interface estimate, not a security guarantee.

## Technology and dependencies

- **React 19 + TypeScript** — typed, component-based interface
- **Vite** — development server and optimized static builds
- **Tailwind CSS 4** — utility styling, with semantic CSS tokens for themes and shared components
- **React Router** — client-side routes and navigation
- **Lucide React** — tree-shaken interface icons
- **diff** — a small, established line-diff implementation, loaded only with the diff tool
- **yaml** — YAML 1.2 parsing and serialization with bounded alias expansion
- **react-markdown + remark-gfm** — React-based Markdown rendering and GitHub-style tables/task lists, with raw HTML disabled
- **qrcode** — local QR encoding and PNG generation; **@types/qrcode** supplies development-only types
- These new libraries load only when opening their tool routes.
- **React `useSyncExternalStore`** — lightweight preference subscriptions; no extra state library needed
- **Vitest, Playwright, axe-core, ESLint, Prettier** — development-only testing, accessibility checks, linting, and formatting

Native browser APIs handle Unicode, dates, secure randomness, hashing, clipboard access, downloads, and color selection.

## Privacy and storage

Your data stays on your device. DevToolbox processes supported inputs locally in your browser.

Only theme, sidebar state, favorite tool IDs, and recently used tool IDs are saved under the versioned `devtoolbox.preferences.v1` localStorage key. Tool inputs, decoded tokens, generated passwords, and outputs are held in memory and discarded when leaving a tool or refreshing. Clipboard and downloaded files persist independently according to your operating system and browser.

There are no remote fonts, telemetry scripts, automatic external requests, authentication, databases, or API credentials. Markdown blocks remote images; embedded raster data URLs are supported. Preview links open only when clicked. The host serves the application files and may log ordinary page requests according to its own configuration; tool input is never part of those requests. The application itself does not report usage.

Malformed or unsupported stored preferences fall back to safe defaults. If writing localStorage fails, the app keeps working in memory and shows a notice. Changes are synchronized between tabs through browser storage events.

## Getting started

Use **Node.js 22.12 or newer** (a current LTS version is recommended) and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. For secure randomness, hashing, and clipboard support, use **localhost or HTTPS** in a current browser.

## Commands

```sh
npm run dev          # Local development
npm run lint         # ESLint
npm run typecheck    # Strict TypeScript checks
npm test             # Utility and storage tests
npm run test:e2e     # Builds the app, then runs browser tests
npm run format      # Format source and configuration
npm run format:check # Verify formatting
npm run build        # TypeScript check and production build
npm run preview      # Preview the production build locally
```

Install the Chromium test browser once before running browser tests:

```sh
npx playwright install chromium
```

On Linux CI, use `npx playwright install --with-deps chromium`.

Browser tests start their own preview server. If port 4173 is occupied, set `DEVTOOLBOX_TEST_PORT` to another available port before running `npm run test:e2e`.

Browser tests cover every tool, invalid input, clipboard/download behavior, worker timeout recovery, search keys, local preferences, reset dialogs, route loading, external-request absence, and horizontal overflow at 320, 375, 768, 1024, 1440, and 1920 pixels. Accessibility checks exercise light and dark pages, the command palette, and the mobile drawer.

## Production build and hosting

```sh
npm ci
npm run build
```

The `dist/` directory contains the complete static app. Deploy it to a static host over HTTPS. Configure a history fallback that serves `index.html` for application routes such as `/tools/json`; missing app routes are handled by the app’s 404 page. A direct filesystem `file://` URL is not supported.

Serve fingerprinted files in `dist/assets/` with long immutable cache headers, and `index.html` with revalidation. Keep the regex worker asset on the same origin. No server environment variables are necessary. The app is not a PWA: cached/offline reopening is not guaranteed, although loaded utilities perform their calculations without a network connection.

## Project structure

```text
src/
  components/       Shared layout, tool cards, editors, dialogs, toasts
  features/         Keyboard command palette
  lib/              Pure encoding, color, date, randomness, regex, diff utilities
  pages/            Dashboard, catalog, collections, settings, tool shell, 404
  registry/         Tool metadata and lazy imports — the source of truth
  storage/          Versioned preference validation and subscriptions
  styles/           Tailwind entry point, semantic tokens, responsive styles
  tools/            One focused module per tool; regex worker beside its UI
  App.tsx           Route composition and error boundary
  main.tsx          Application entry
tests/              Browser workflows and accessibility checks
scripts/            Local screenshot capture helper
public/             Locally served favicon
```

### Adding a tool

1. Create a default-exported component in `src/tools/<id>/`.
2. Add a definition with a lazy import to `src/registry/tools.ts`.
3. Add pure transformation logic under `src/lib/` when useful, and test meaningful edge cases.

Catalog cards, category counts, route rendering, favorites, recent tools, and global search automatically use the registry. Keep input/output state inside the tool. Persist only appropriate preferences through the storage module.

## Scope and limits

- JSON follows native JavaScript parsing, including its number-precision limits.
- Base64 decoding expects UTF-8 text, not arbitrary binary files.
- JWT supports three-section JSON tokens; encrypted five-section tokens are not supported.
- Regex execution is stopped after one second. Input is limited to 100,000 characters; results are capped at 1,000 matches. Indices are JavaScript UTF-16 offsets.
- Diffs are line-based, limited to 200,000 total characters and 4,000 total lines, with a bounded edit search. Changed lines appear as paired additions and removals.
- Colors use opaque sRGB, three/six-digit HEX, comma-separated RGB, and comma-separated HSL. RGB channels are rounded to integers.
- Date input uses the device’s time zone and browser daylight-saving rules.
- YAML conversion supports JSON-compatible values, with 200,000 input characters, 20,000 converted nodes, and 80 nesting levels. Non-string keys, circular aliases, non-finite numbers, unsafe integers, and custom tags are rejected rather than silently changed. Comments and formatting are not preserved.
- Markdown preview is limited to 100,000 characters. Raw HTML is ignored; remote images and embedded SVG are blocked. Embedded PNG, JPEG, GIF, and WebP images work.
- QR capacity depends on UTF-8 byte length and correction level; excessive input reports an error. Generated images include the standard quiet zone.
- Number-base conversion supports signed integers with up to 4,096 input digits, without floating-point precision loss.
- Contrast calculations use the [WCAG relative luminance and contrast definitions](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Pass/fail uses unrounded ratios. Transparency is not supported.
- Cron builds five-field expressions; it does not run a scheduler or predict future executions. Platform/time-zone behavior varies. Day of week uses 0 (Sunday) through 6 (Saturday).
- URL parsing hides credential passwords and redacts common secret query keys. Arbitrary paths, fragments, and unrecognized query names should be reviewed before sharing. Native URL normalization applies.
- Browser tests currently target Chromium. Cross-engine Firefox/Safari verification remains useful before a wider release.

## Future roadmap

These are planned extensions, not current functionality:

- JSON ↔ CSV converter
- XML, SQL, HTML, CSS, and JavaScript formatters
- Slug converter
- CSS gradient and box shadow generators
- HTTP status code reference and MIME type lookup
- Fake data generator and text statistics

## Contributing

Keep utilities local, dependencies small, metadata centralized, and malformed input recoverable. Add keyboard-accessible controls with visible focus. Include meaningful tests for new transformations and edge cases. Run lint, type checks, unit tests, browser tests, formatting checks, and a production build before proposing a change. Document any new limits or browser requirements.

## License

License to be selected by the project owner. No open-source license has been granted yet.
