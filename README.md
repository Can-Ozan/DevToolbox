# DevToolbox v3.1

> A local-first developer workspace with **29 tools**, image & PDF utilities, and a reusable browser file vault.

[![Deploy DevToolbox to GitHub Pages](https://github.com/Can-Ozan/DevToolbox/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Can-Ozan/DevToolbox/actions/workflows/deploy-pages.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tools](https://img.shields.io/badge/Tools-29-7C3AED)

### 🔗 Live Demo

**https://can-ozan.github.io/DevToolbox/**

**Workflow & UX Update — local developer workspace & utility platform.**

DevToolbox brings everyday developer utilities, local file workflows, image processing, and PDF tools into one fast browser-based application.

No account. No backend. No analytics. No cloud file upload.  
Supported processing runs locally in your browser.

---

## ✨ Highlights

- **29 developer tools** in one interface
- **Local Workspace / File Vault** powered by IndexedDB
- Reuse files between compatible tools without uploading them again
- Local image conversion, compression, resizing, rotation and metadata inspection
- Local PDF merge, split, reorder and Images → PDF workflows
- Local favorites and the last 10 unique tools visited
- Universal **Ctrl/Cmd + K** command palette for tools, Workspace file metadata and actions
- Light, dark and system themes
- Responsive desktop/mobile interface
- Keyboard-friendly and accessibility-focused controls
- Lazy-loaded tools and workers
- No authentication, remote database or conversion API required

---

## What's new in v3.1

- Dashboard with quick actions, live Workspace file counts and up to three pinned/recent files to continue working on.
- Universal command palette groups tools, Workspace file metadata and navigation/theme actions. File contents are never searched.
- Workspace grid/list views, type filters, on-demand image thumbnails, keyboard-accessible overflow menus and approximate storage meter.
- Explicit **Save & open** handoffs and **Continue with** actions derived from file compatibility; nothing is saved automatically.
- Lightweight related-tool links, meaningful file/Workspace badges and sidebar favorites.
- Clear drop states, real processing stages and completed-result details for image/PDF workflows.
- Local tool-open counts power **Most used** after three distinct tools have been visited; otherwise the dashboard shows a curated **Featured tools** list. All Tools can sort by name, usage, recency or favorites.
- Settings for JSON indentation, HEX letter case, image quality/background and Workspace clearing. Defaults apply on the next tool opening; usage counts can be cleared independently.

---

## 🗂️ Workspace

The Workspace / File Vault keeps files available across compatible tools in the current browser profile.

You can:

- Import files from your device
- Drag & drop files or use the file picker
- Save generated outputs to Workspace
- Reuse an output directly in another compatible tool
- Pin important files
- Preview supported images and text files, with on-demand image thumbnails in Grid view
- Download, pin/unpin, copy filenames or delete files through a keyboard-accessible overflow menu
- View file size, MIME type, source tool and creation time
- Switch between persistent Grid/List views and filter by file type
- Check approximate browser storage usage in a visual meter

Open **Workspace** in navigation or search for it with Ctrl/Cmd + K. Choose a persistent Grid/List view and filter by file type. Search results focus the matching file card; secondary actions are in its three-dot menu (arrow keys, Enter, Escape). Import files with the device picker or drag and drop. Files are listed with type, size, date and source tool, with pinned files first and recent files next. Image and bounded plain-text previews are available; other formats show metadata and compatible tools. Only PNG, JPEG, WebP and PDF are accepted by the new processing tools; the vault can also store other file types for downloading.

Every new file tool offers **Upload from device** and **Choose from Workspace**. The picker filters by accepted MIME type; actual image/PDF parsing validates the contents before processing. **Download** exports the result, and **Save to Workspace** persists a new file. Duplicate names receive suffixes such as `image-converted-2.png`; existing files are never replaced. Device inputs are only stored when explicitly imported or saved.

### Example workflow

```text
JPG
 ↓
Image Format Converter
 ↓
Save & open Image Compressor
 ↓
Compress image
 ↓
Download
```

Another example:

```text
Images
 ↓
Images → PDF
 ↓
Save & open PDF Splitter
 ↓
Extract selected pages
```

### IndexedDB storage and browser storage limits

`src/workspace/db.ts` owns database access. Database `devtoolbox.workspace`, schema version 1, has a `files` metadata store keyed by secure UUID and a `blobs` store keyed by the same ID. A unique filename index plus a single read/write transaction protects naming and writes across tabs. Delete and clear also update both stores atomically. Lists and command search load metadata only; previews, visible image thumbnails and tool inputs read blobs on demand. Thumbnails are reduced locally, and object URLs are released when no longer displayed. `workspaceStore.ts` exposes subscriptions and refreshes on tab focus.

Files remain in this browser profile and origin unless downloaded/exported by the user. They are not synced between devices or domains. Browser data can be cleared by you or the browser; **keep downloaded copies of important files**. The approximate usage/quota display uses `navigator.storage.estimate()` when available and covers the whole origin, not only Workspace. Storage is not a permanent backup.

Unavailable/blocked IndexedDB, full storage, damaged metadata and missing blobs produce inline errors. A failed save does not silently fall back to temporary storage or remove the tool output. Device input and downloads remain available. Invalid metadata is reported without silently deleting it.

---

## 🧰 Tools

### Core developer tools

| Tool                     | Main capabilities                                             |
| ------------------------ | ------------------------------------------------------------- |
| JSON Formatter           | Format, minify, validate, indentation, copy and download      |
| Base64 Encoder / Decoder | Unicode-safe UTF-8 encode/decode                              |
| UUID Generator           | Secure UUID v4 generation in batches                          |
| JWT Decoder              | Decode header/payload and inspect standard claims             |
| URL Encoder / Decoder    | Full URL and component encoding                               |
| Unix Timestamp Converter | Seconds, milliseconds, local time, UTC and ISO                |
| Hash Generator           | SHA-1, SHA-256, SHA-384 and SHA-512                           |
| Regex Tester             | Matches, captures, flags, highlighting and timeout protection |
| Password Generator       | Secure configurable 8–128 character passwords                 |
| Color Converter          | HEX, RGB and HSL conversion                                   |
| Lorem Ipsum Generator    | Paragraph, sentence and word generation                       |
| Text Diff Checker        | Side-by-side and unified line diffs                           |

### More developer tools

| Tool                    | Main capabilities                                     |
| ----------------------- | ----------------------------------------------------- |
| JSON ↔ YAML Converter   | Two-way conversion, validation and downloads          |
| Markdown Previewer      | Live GFM preview, tables, task lists and code blocks  |
| Cron Expression Builder | Visual 5-field builder, presets and descriptions      |
| QR Code Generator       | Local QR generation with PNG download                 |
| Case Converter          | 10 case formats including camel, snake and kebab      |
| Number Base Converter   | Binary, octal, decimal and hexadecimal using BigInt   |
| Color Contrast Checker  | WCAG AA/AAA contrast checks                           |
| URL Parser              | URL components, query parameters and secret redaction |

### Image tools

| Tool                   | Main capabilities                                         |
| ---------------------- | --------------------------------------------------------- |
| Image Format Converter | PNG / JPEG / WebP conversion with JPEG background control |
| Image Compressor       | JPEG/WebP quality controls and size comparison            |
| Image Resizer          | Width, height, aspect ratio, percentage and presets       |
| Image Rotate / Flip    | 90° / 180° / 270° and horizontal/vertical flips           |
| Image Metadata Viewer  | Filename, MIME type, size, width, height and aspect ratio |

### PDF tools

| Tool             | Main capabilities                                    |
| ---------------- | ---------------------------------------------------- |
| PDF Merger       | Merge multiple PDFs in a chosen order                |
| PDF Splitter     | Extract ranges such as `1-3,5,8-10`                  |
| PDF Page Reorder | Reorder or omit pages using a numeric page list      |
| Images → PDF     | PNG/JPEG/WebP to A4 PDF with fit and margin controls |

> PDF → Images is deferred. `pdf-lib` edits PDF structure but does not render pages; reliable browser-side raster export requires a separate rendering engine such as PDF.js. No PDF rendering dependency is included in this release.

---

## 🔒 Privacy

DevToolbox follows a local-first model.

- Tool inputs are not sent to a conversion API
- File processing happens in the browser
- Workspace files are stored locally in IndexedDB
- Preferences are stored locally
- No analytics or telemetry scripts are included
- No account is required
- No remote database is required
- Dependencies are bundled with the application rather than loaded from runtime CDNs

Theme, sidebar state, favorite/recent tool IDs, small local tool-open counts, Workspace view and tool defaults are saved under the versioned `devtoolbox.preferences.v1` localStorage key. Workspace files and their metadata are stored in IndexedDB, never localStorage. Unsaved tool inputs/outputs, decoded tokens and generated passwords are held in memory and discarded when leaving a tool or refreshing. Explicitly imported/saved Workspace files remain until removed or browser storage is cleared. Clipboard and downloaded files persist independently according to your operating system and browser.

There are no remote fonts, telemetry scripts, automatic external requests, authentication, remote databases, or API credentials. All processing dependencies and workers are bundled and served by the app's host; no runtime CDN packages or conversion APIs are used. File contents are not uploaded. Markdown blocks remote images; embedded raster data URLs are supported. Preview links open only when clicked. The host serves the application files and may log ordinary page requests according to its own configuration; tool input is never part of those requests. Usage counts remain in localStorage; the application does not report them to any service. No tool inputs or file contents are included in usage metadata.

Malformed or unsupported stored preferences fall back to safe defaults. If writing localStorage fails, the app keeps working in memory and shows a notice. Changes are synchronized between tabs through browser storage events.

---

## ⚙️ Processing limits

To reduce browser freezes and excessive memory usage:

- Images: up to **50 MB** each
- PDFs / other files: up to **100 MB** each
- Batch input: up to **30 files / 150 MB**
- Workspace: up to **500 entries**
- Images: up to **8192 px per side / 16 MP**
- PDFs: up to **500 pages**
- PDF worker timeout: **30 seconds**

Limits are browser-side safety boundaries, not guarantees that every device can comfortably process the maximum size. These limits live in `src/workspace/workspaceUtils.ts`. Image headers are checked before decoding. Cancel or leave a tool to terminate its PDF worker. Use smaller inputs on memory-constrained devices.

---

## 🧪 Quality & testing

The v3.1 release was verified with:

- **139 unit tests**
- **47 E2E tests** (Chromium)
- TypeScript type checking
- ESLint
- Production build verification
- Responsive coverage
- Accessibility checks
- Workspace persistence/failure scenarios
- Image and PDF workflows
- Mobile navigation regression tests
- Universal command search, usage tracking, Workspace views/menus and compatible-tool handoffs
- External-request checks for local processing flows

Browser tests cover every tool, invalid input, clipboard/download behavior, worker timeout recovery, search keys, local preferences, reset dialogs, route loading, external-request absence, and horizontal overflow at 320, 375, 768, 1024, 1440, and 1920 pixels. Accessibility checks exercise light and dark pages, the command palette, and the mobile drawer.

Workspace tests cover transactional add/retrieve/delete, concurrent duplicate names, pinning, missing blobs, corrupt metadata, storage unavailability and quota rollback. New browser workflows exercise image conversions and JPEG alpha handling, cross-tool persistence/reuse, PDF ordering/extraction, drag/drop, clear confirmation, MIME filtering, downloaded contents, loaded mobile layouts and file dialogs.

Browser E2E tests currently target Chromium. Firefox/Safari verification is still useful before broader cross-browser guarantees.

---

## 🛠️ Tech stack

- **React 19**
- **TypeScript 6**
- **Vite 8**
- **Tailwind CSS 4**
- **React Router**
- **IndexedDB**
- **Canvas / Web APIs**
- **pdf-lib**
- **yaml**
- **react-markdown + remark-gfm**
- **qrcode**
- **Vitest**
- **Playwright**
- **axe-core**
- **ESLint + Prettier**

---

## 🚀 Getting started

### Requirements

- Node.js **22.12+**
- npm

### Install

```bash
git clone https://github.com/Can-Ozan/DevToolbox.git
cd DevToolbox
npm ci
npm run dev
```

Then open the local Vite URL shown in the terminal. For secure randomness, hashing and clipboard support, use **localhost or HTTPS** in a current browser.

---

## 📜 Commands

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

Install the Chromium test browser once before running E2E tests:

```bash
npx playwright install chromium
```

Linux CI:

```bash
npx playwright install --with-deps chromium
```

Browser tests start their own preview server. If port 4173 is occupied, set `DEVTOOLBOX_TEST_PORT` to another available port before running `npm run test:e2e`.

---

## 🌐 Deployment

DevToolbox is deployed with **GitHub Pages**:

**https://can-ozan.github.io/DevToolbox/**

The repository includes GitHub Pages support for:

- Vite base path via `VITE_BASE_PATH=/DevToolbox/` in the Pages build workflow
- React Router basename derived from the Vite base URL
- Base-aware favicon: `%BASE_URL%favicon.svg`
- SPA `404.html` fallback generated from the production entry page
- `.nojekyll`
- Bundled workers and lazy-loaded assets served from the same origin

```sh
npm ci
npm run build
```

The `dist/` directory contains the complete static app. Deploy it to a static host over HTTPS. Configure a history fallback that serves `index.html` for application routes such as `/tools/json`; missing app routes are handled by the app’s 404 page. A direct filesystem `file://` URL is not supported.

Serve fingerprinted files in `dist/assets/` with long immutable cache headers, and `index.html` with revalidation. Keep the regex and PDF worker assets on the same origin. No server environment variables are necessary.

### PWA status

PWA support is deferred in v3.1 to avoid service-worker cache invalidation and subpath deployment risk in this UX release. No service worker or offline cache has been added; offline reopening is not guaranteed, although loaded utilities process inputs locally. Workspace blobs remain exclusively in IndexedDB.

---

## 📁 Project structure

```text
src/
  components/       Shared layout, UI, dialogs and toasts
  features/         Command palette
  lib/              Pure transformation and processing utilities
  pages/            Dashboard, catalog, collections, settings and 404
  registry/         Central tool registry
  storage/          Local preference persistence
  workspace/        IndexedDB File Vault and reusable file controls
  styles/           Theme, responsive and workspace styles
  tools/
    image/           Image processing tools
    pdf/             PDF tools and worker
    ...              Existing developer tools
tests/              Playwright and accessibility workflows
marketing/          LinkedIn promotional assets
public/             Static assets
```

The tool registry remains the source of truth for search, categories, favorites, recent tools, routing and Workspace compatibility. Compatible-tool handoffs derive from `producesFileTypes`, `acceptsFileTypes` and `workspaceCompatible`; related-tool links are bounded to keep tool pages uncluttered.

---

## ➕ Adding a tool

1. Create the tool component under `src/tools/<id>/`.
2. Add its metadata and lazy import to `src/registry/tools.ts`.
3. Put reusable transformation logic under `src/lib/`.
4. Add focused tests for important logic and edge cases.
5. For Workspace-enabled tools, declare:
   - `acceptsFileTypes`
   - `producesFileTypes`
   - `workspaceCompatible`
6. Reuse the shared Workspace file picker/output components instead of duplicating file handling.

---

## ⚠️ Important limitations

- JWT decoding does **not** verify authenticity or signatures.
- Base64 decoding expects UTF-8 text rather than arbitrary binary files.
- Regex execution is terminated after one second.
- Markdown raw HTML is ignored; remote images are blocked.
- Canvas image operations re-encode the image; metadata/animation is not preserved.
- Animated WebP is not supported.
- PNG compression is not advertised as lossless optimization.
- PDF tools support unencrypted PDFs.
- PDF page copying may not preserve every document-level feature such as signatures, bookmarks or interactive forms.
- Workspace storage is browser storage, not a permanent backup.

---

## 🗺️ Roadmap

Potential future additions:

- JSON ↔ CSV
- XML formatter
- SQL formatter
- HTML / CSS / JavaScript formatter
- Slug tools
- HTTP status reference
- MIME type lookup
- Git cheat sheet
- VS Code extension finder
- package.json analyzer
- ZIP utilities
- CSV utilities
- Additional image utilities
- PDF → Images
- Audio metadata tools

---

## 🤝 Contributing

Keep new utilities:

- Local-first where practical
- Small and focused
- Keyboard accessible
- Recoverable on malformed input
- Lazy-loaded when dependencies are heavy
- Covered by meaningful tests

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

## 👤 Author

**Yusuf Can Ozan**

- GitHub: [@Can-Ozan](https://github.com/Can-Ozan)
- DevToolbox: https://can-ozan.github.io/DevToolbox/

---

## 📄 License

A license has not been selected yet. Until a license is added, normal copyright rules apply.
