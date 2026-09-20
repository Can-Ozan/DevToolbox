# DevToolbox v3.2

> **32 local-first developer tools. One workspace. Zero backend.**

[![Deploy DevToolbox to GitHub Pages](https://github.com/Can-Ozan/DevToolbox/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Can-Ozan/DevToolbox/actions/workflows/deploy-pages.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tools](https://img.shields.io/badge/Tools-32-7C3AED)
![Local First](https://img.shields.io/badge/Local--First-Yes-22C55E)

## Live Demo

**https://can-ozan.github.io/DevToolbox/**

DevToolbox is a browser-based developer workspace built for fast, private, everyday utility work.

No account. No backend. No analytics. No cloud file upload.

Supported processing runs locally in the browser, while the built-in Workspace keeps reusable files available through IndexedDB.

---

## What's new in v3.2

**Offline & Conversion Update**

- Installable **PWA** with offline app-shell support after the first successful visit
- New **PDF → Images** tool powered by lazy-loaded, locally bundled PDF.js
- New **Image Cropper** with pointer, keyboard, numeric and aspect-ratio controls
- New **JSON ↔ CSV Converter** with robust quoted-field parsing and delimiter support
- Improved Blob/Object URL lifecycle cleanup for previews, downloads and processing flows
- Safer PWA update handling across tabs
- Expanded lifecycle, rendering, Workspace and regression coverage
- **32 tools total**

PWA is a platform feature and is not counted as a tool.

---

## Why DevToolbox?

DevToolbox is designed around a few simple principles:

- **Local-first** — supported files and text are processed in the browser
- **Fast** — tools are lazy-loaded and focused on a single task
- **Private** — no analytics, telemetry or conversion API
- **Reusable** — generated files can move between compatible tools through Workspace
- **Accessible** — keyboard-friendly controls, visible focus states and responsive layouts
- **Portable** — installable as a PWA on supported browsers
- **Static-host friendly** — production deployment works on GitHub Pages

---

## Workspace

The built-in **Workspace / File Vault** keeps files available across compatible tools without uploading them to a server.

You can:

- import files from your device
- drag and drop supported files
- save generated outputs explicitly
- reuse outputs in compatible tools
- pin important files
- preview supported images and text
- switch between Grid and List views
- filter by file type
- inspect approximate browser storage usage
- download or delete files at any time

Workspace files are stored in **IndexedDB** in the current browser profile. They are not a cloud backup and are not synchronized between devices.

### Example workflow

```text
PDF
 ↓
PDF → Images
 ↓
Save page to Workspace
 ↓
Image Cropper
 ↓
Image Compressor
 ↓
Download
```

Another example:

```text
JPG
 ↓
Image Cropper
 ↓
Save & open Image Compressor
 ↓
Compress
 ↓
Download
```

---

## Tools

### Developer & Data

| Tool | Capability |
| --- | --- |
| JSON Formatter | Format, validate and minify JSON |
| Base64 Encoder / Decoder | Unicode-safe text encoding and decoding |
| UUID Generator | Secure UUID v4 generation |
| JWT Decoder | Inspect JWT header, payload and claims |
| Regex Tester | Test patterns, captures and flags |
| URL Encoder / Decoder | Encode/decode full URLs and components |
| Unix Timestamp Converter | Convert epoch, local, UTC and ISO dates |
| Hash Generator | SHA-1, SHA-256, SHA-384 and SHA-512 |
| Markdown Previewer | Live GFM preview |
| Cron Expression Builder | Build five-field cron expressions |
| URL Parser | Inspect URL components and query parameters |
| JSON ↔ YAML Converter | Two-way structured-data conversion |
| JSON ↔ CSV Converter | Flat JSON tables ↔ quoted CSV |

### Generators & Utilities

| Tool | Capability |
| --- | --- |
| Password Generator | Configurable secure passwords |
| QR Code Generator | Local QR generation with PNG download |
| Lorem Ipsum Generator | Words, sentences and paragraphs |
| Text Diff Checker | Side-by-side and unified text comparison |
| Case Converter | Common casing formats |
| Number Base Converter | Binary, octal, decimal and hexadecimal |
| Color Converter | HEX, RGB and HSL |
| Color Contrast Checker | WCAG AA/AAA contrast checks |

### Image

| Tool | Capability |
| --- | --- |
| Image Format Converter | PNG / JPEG / WebP conversion |
| Image Compressor | JPEG/WebP quality and size reduction |
| Image Resizer | Dimensions, percentage and presets |
| Image Rotate / Flip | Rotation and mirroring |
| Image Metadata Viewer | Size, MIME, dimensions and aspect ratio |
| Image Cropper | Free/fixed-ratio crop with keyboard and numeric controls |

### PDF

| Tool | Capability |
| --- | --- |
| PDF Merger | Combine multiple PDFs |
| PDF Splitter | Extract selected pages/ranges |
| PDF Page Reorder | Reorder or omit pages |
| Images → PDF | Convert ordered images into a PDF |
| PDF → Images | Render selected pages to PNG/JPEG |

---

## v3.2 conversion details

### PDF → Images

- accepts PDF input from device or Workspace
- renders pages locally with PDF.js
- supports all pages or custom ranges such as `1-3,5,8`
- outputs PNG or JPEG
- supports 1×, 1.5× and 2× render scale
- provides cancellation and processing status
- generated images can be downloaded, saved to Workspace or passed to compatible image tools
- PDF.js is lazy-loaded and does not use a runtime CDN

### Image Cropper

- Free, 1:1, 4:3, 16:9 and 3:2 crop modes
- drag/resize crop selection
- keyboard and numeric controls
- PNG, JPEG and WebP output
- JPEG/WebP quality controls where applicable
- compatible with existing Workspace image workflows

Raster output is re-encoded, so embedded metadata and animation are not preserved.

### JSON ↔ CSV

- JSON → CSV expects a non-empty array of flat objects
- nested objects/arrays are rejected instead of silently flattened
- supports comma, semicolon and tab delimiters
- quoted fields, escaped quotes, UTF-8 BOMs and embedded delimiters/newlines are handled
- missing/null values become empty cells
- malformed CSV produces an explicit error
- tool input stays in memory and is not persisted to localStorage

---

## PWA & Offline

DevToolbox can be installed as a Progressive Web App on supported browsers.

After the first successful online visit:

- the app shell can reopen offline
- nested GitHub Pages routes continue to work
- updates are shown through a user-controlled reload prompt
- active file jobs are not interrupted by forced reloads

The service worker caches application assets only.

**Workspace files remain in IndexedDB and are not stored in the service-worker cache.**

Offline availability still depends on browser storage/cache state. A first visit requires a network connection.

---

## Privacy

DevToolbox follows a local-first model.

- no account
- no backend
- no analytics
- no telemetry
- no conversion API
- no runtime CDN for processing dependencies
- no automatic file upload
- Workspace files stay in IndexedDB
- small preferences and local usage counts stay in localStorage

Temporary Blob/Object URLs used by previews and downloads have explicit cleanup lifecycles. PDF.js receives local data rather than requiring a hosted PDF URL.

---

## Processing limits

Browser-side safety limits currently include:

- images: **50 MB each**
- PDFs / other files: **100 MB each**
- batch input: **30 files / 150 MB**
- Workspace: **500 entries**
- images: **8192 px per side / 16 MP**
- PDFs: **500 pages**
- PDF worker/render timeout: **30 seconds**
- PDF → Images output: **30 pages / 32 MP total**
- JSON ↔ CSV: **200,000 characters / 10,000 rows / 200 columns / 100,000 cells**

These are safety boundaries, not guarantees that every device can comfortably process the maximum size.

---

## Quality

The project includes automated coverage for:

- transformation utilities
- Workspace persistence and failure scenarios
- file handoffs
- image workflows
- PDF workflows
- PDF rendering cleanup
- Blob/Object URL lifecycle cleanup
- PWA install/update behavior
- offline reload behavior
- multi-tab update behavior
- responsive layouts
- keyboard navigation
- accessibility checks
- external-request regressions

The current browser E2E suite targets Chromium. Firefox/Safari verification remains useful before broader cross-browser guarantees.

---

## Tech stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- React Router
- IndexedDB
- Canvas / Web APIs
- pdf-lib
- pdfjs-dist
- vite-plugin-pwa
- yaml
- react-markdown + remark-gfm
- qrcode
- Vitest
- Playwright
- axe-core
- ESLint
- Prettier

---

## Getting started

### Requirements

- Node.js **22.13+**
- npm

### Install

```bash
git clone https://github.com/Can-Ozan/DevToolbox.git
cd DevToolbox
npm ci
npm run dev
```

Then open the local Vite URL shown in the terminal.

---

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run format
npm run format:check
npm run build
npm run preview
```

Install Chromium once for E2E tests:

```bash
npx playwright install chromium
```

---

## Deployment

DevToolbox is deployed on GitHub Pages:

**https://can-ozan.github.io/DevToolbox/**

The repository supports:

- `VITE_BASE_PATH=/DevToolbox/`
- React Router basename derived from the Vite base URL
- base-aware favicon paths
- SPA `404.html` fallback
- `.nojekyll`
- same-origin bundled workers and lazy assets
- PWA assets compatible with the GitHub Pages subpath

Production build:

```bash
npm ci
npm run build
```

---

## Project structure

```text
src/
  components/       Shared UI, dialogs and layout
  features/         Command palette
  lib/              Pure transformation/processing logic
  pages/            Dashboard, catalog, settings and route pages
  pwa/              PWA state/update helpers
  registry/         Tool metadata and lazy imports
  storage/          Local preferences
  workspace/        IndexedDB File Vault and file controls
  styles/           Theme and responsive styles
  tools/            Individual tools

tests/              Playwright and accessibility coverage
public/             Static/PWA assets
docs/               Technical lifecycle notes
marketing/          Promotional assets
```

The central tool registry remains the source of truth for routing, search, categories, favorites, recent tools and Workspace compatibility.

---

## Adding a tool

1. Create the component under `src/tools/<id>/`.
2. Register metadata and the lazy import in `src/registry/tools.ts`.
3. Put reusable processing logic under `src/lib/`.
4. Add focused tests.
5. For Workspace-enabled tools, declare:
   - `acceptsFileTypes`
   - `producesFileTypes`
   - `workspaceCompatible`
6. Reuse shared Workspace file controls instead of duplicating file handling.

---

## Important limitations

- JWT decoding does **not** verify signatures or authenticity.
- Base64 decoding targets UTF-8 text rather than arbitrary binary files.
- Regex execution is time-limited.
- Markdown raw HTML is ignored and remote images are blocked.
- Canvas-based image operations re-encode images.
- Animated WebP is not supported.
- PDF tools support unencrypted PDFs.
- PDF page copying may not preserve all document-level features.
- Workspace storage is browser storage, not a permanent backup.
- First-time PWA use requires a network connection.

---

## Roadmap

Potential future additions:

- XML formatter
- SQL formatter
- HTML / CSS / JavaScript formatter
- ZIP utilities
- HTTP status reference
- MIME type lookup
- Git cheat sheet
- package.json analyzer
- additional image utilities
- audio metadata tools

---

## Contributing

Keep additions:

- local-first where practical
- focused
- keyboard accessible
- resilient to malformed input
- lazy-loaded when dependencies are heavy
- covered by meaningful tests

Before proposing changes:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run format:check
npm run build
```

---

## Author

**Yusuf Can Ozan**

- GitHub: [@Can-Ozan](https://github.com/Can-Ozan)
- DevToolbox: https://can-ozan.github.io/DevToolbox/

---

## License

A license has not been selected yet. Until a license is added, normal copyright rules apply.
