# DevToolbox v3.0

**Local developer workspace & utility platform.**

A local workspace with 29 developer utilities, built with React and TypeScript. The original 20 tools are joined by five image tools and four PDF tools. Processing runs in the browser. No account, remote database, backend, analytics, or external API is required.

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
- IndexedDB File Vault with imports, generated files, pinning, previews, downloads, deletion and confirmed clearing
- Reusable Workspace file picker, compatible-tool handoffs and output saving without overwrites
- Local image processing with Canvas; PDF processing in a cancellable, time-limited worker

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

### New in v3.0: Image tools

| Tool | Capabilities |
| --- | --- |
| Image Format Converter | PNG/JPEG/WebP conversion, lossy quality, JPEG transparency background, input/output previews |
| Image Compressor | JPEG/WebP quality controls, original/output sizes, percentage smaller or larger |
| Image Resizer | Width, height, aspect lock, percentage, width presets and allocation limits |
| Image Rotate / Flip | 90°/180°/270° rotation and horizontal/vertical flips |
| Image Metadata Viewer | Filename, MIME, bytes, width, height and aspect ratio; no EXIF/GPS parsing |

### New in v3.0: PDF tools

| Tool | Capabilities |
| --- | --- |
| PDF Merger | Multiple files, drag reorder and keyboard move buttons, removal, merged output |
| PDF Splitter | Extract a selection such as `1-3,5,8-10` into one PDF |
| PDF Page Reorder | Numeric page order such as `3,1,2`; omit pages to remove them |
| Images → PDF | PNG/JPEG/WebP inputs, ordering, A4 portrait/landscape, fit/fill and margins |

PDF → Images is deferred. `pdf-lib` edits PDF structure but does not render pages; reliable raster export needs a separate rendering engine such as PDF.js. That additional bundle, worker and rendering lifecycle are outside this release. No PDF rendering dependency is installed.

## Workspace and file processing

Open **Workspace** in navigation or search for it with Ctrl/Cmd + K. Import files with the device picker or drag and drop. Files are listed with type, size, date and source tool, with pinned files first and recent files next. Image and bounded plain-text previews are available; other formats show metadata and compatible tools. Only PNG, JPEG, WebP and PDF are accepted by the new processing tools; the vault can also store other file types for downloading.

Every new file tool offers **Upload from device** and **Choose from Workspace**. The picker filters by accepted MIME type; actual image/PDF parsing validates the contents before processing. **Download** exports the result, and **Save to Workspace** persists a new file. Duplicate names receive suffixes such as `image-converted-2.png`; existing files are never replaced. Device inputs are only stored when explicitly imported or saved.

Workflow examples:

1. Image Format Converter → convert JPG to PNG → Save to Workspace → Image Compressor → Choose from Workspace → compress → Download.
2. Images → PDF → Save to Workspace → Use in PDF Splitter → choose a page range → extract and save or download.

### IndexedDB storage and browser storage limits

`src/workspace/db.ts` owns database access. Database `devtoolbox.workspace`, schema version 1, has a `files` metadata store keyed by secure UUID and a `blobs` store keyed by the same ID. A unique filename index plus a single read/write transaction protects naming and writes across tabs. Delete and clear also update both stores atomically. Lists load metadata only; blobs load on demand. `workspaceStore.ts` exposes subscriptions and refreshes on tab focus.

Files remain in this browser profile and origin unless downloaded/exported by the user. They are not synced between devices or domains. Browser data can be cleared by you or the browser; **keep downloaded copies of important files**. The approximate usage/quota display uses `navigator.storage.estimate()` when available and covers the whole origin, not only Workspace. Storage is not a permanent backup.

Unavailable/blocked IndexedDB, full storage, damaged metadata and missing blobs produce inline errors. A failed save does not silently fall back to temporary storage or remove the tool output. Device input and downloads remain available. Invalid metadata is reported without silently deleting it.

Configurable processing limits live in `workspaceUtils.ts`: 50 MB per image, 100 MB per other file/PDF, 150 MB and 30 files per batch, and 500 Workspace entries. Images are limited to 16 megapixels and 8192 pixels per side. Image headers are checked before decoding. PDFs have a 500-page input/output limit and a 30-second worker timeout. Cancel or leave a tool to terminate its PDF worker. Large/complex files can still exceed practical device memory; use smaller inputs on constrained devices.

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
- **pdf-lib** — added for local PDF page copying, extraction, reordering and image embedding, which native Canvas cannot provide; bundled in a worker loaded only when needed
- **fake-indexeddb** — added as a development-only dependency to test real IndexedDB transaction behavior, blob persistence and error rollback in Vitest
- These new libraries load only when opening their tool routes.
- **React `useSyncExternalStore`** — lightweight preference subscriptions; no extra state library needed
- **Vitest, Playwright, axe-core, ESLint, Prettier** — development-only testing, accessibility checks, linting, and formatting

Native browser APIs handle Unicode, dates, secure randomness, hashing, clipboard access, downloads, and color selection.

## Privacy and storage

Your data stays on your device. DevToolbox processes supported inputs locally in your browser.

Only theme, sidebar state, favorite tool IDs, and recently used tool IDs are saved under the versioned `devtoolbox.preferences.v1` localStorage key. Workspace files and their metadata are stored in IndexedDB, never localStorage. Unsaved tool inputs/outputs, decoded tokens and generated passwords are held in memory and discarded when leaving a tool or refreshing. Explicitly imported/saved Workspace files remain until removed or browser storage is cleared. Clipboard and downloaded files persist independently according to your operating system and browser.

There are no remote fonts, telemetry scripts, automatic external requests, authentication, remote databases, or API credentials. All processing dependencies and workers are bundled and served by the app's host; no runtime CDN packages or conversion APIs are used. File contents are not uploaded. Markdown blocks remote images; embedded raster data URLs are supported. Preview links open only when clicked. The host serves the application files and may log ordinary page requests according to its own configuration; tool input is never part of those requests. The application itself does not report usage.

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

Workspace tests cover transactional add/retrieve/delete, concurrent duplicate names, pinning, missing blobs, corrupt metadata, storage unavailability and quota rollback. New browser workflows exercise image conversions and JPEG alpha handling, cross-tool persistence/reuse, PDF ordering/extraction, drag/drop, clear confirmation, MIME filtering, downloaded contents, loaded mobile layouts and file dialogs.

## Production build and hosting

```sh
npm ci
npm run build
```

The `dist/` directory contains the complete static app. Deploy it to a static host over HTTPS. Configure a history fallback that serves `index.html` for application routes such as `/tools/json`; missing app routes are handled by the app’s 404 page. A direct filesystem `file://` URL is not supported.

Serve fingerprinted files in `dist/assets/` with long immutable cache headers, and `index.html` with revalidation. Keep the regex and PDF worker assets on the same origin. No server environment variables are necessary. The app is not a PWA: cached/offline reopening is not guaranteed, although loaded utilities perform their calculations without a network connection.

## Project structure

```text
src/
  components/       Shared layout, tool cards, editors, dialogs, toasts
  features/         Keyboard command palette
  lib/              Pure encoding, color, date, randomness, regex, diff utilities
  pages/            Dashboard, catalog, collections, settings, tool shell, 404
  registry/         Tool metadata and lazy imports — the source of truth
  storage/          Versioned preference validation and subscriptions
  workspace/        IndexedDB, metadata subscriptions, File Vault, picker and output controls
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
4. For file tools, declare `acceptsFileTypes`, `producesFileTypes` and `workspaceCompatible`, then reuse `WorkspaceFilePicker` and `FileOutputPanel`.

Catalog cards, category counts, route rendering, favorites, recent tools, global search and file compatibility automatically use the registry. Existing category IDs remain intact. Image/PDF categories are active; Text, Web and Resources are reserved, with empty categories omitted from navigation filters. Keep transient input/output state inside the tool and explicit file persistence behind the Workspace abstraction.

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
- Canvas output is a re-encoded still image. Embedded metadata and animation are not preserved; animated WebP is rejected. Browser encoding support can vary, with an inline error instead of a mislabeled fallback format. Compression produces lossy JPEG/WebP and may increase file size; there is no lossless PNG optimizer.
- PDF tools accept unencrypted documents. New documents preserve page content, but interactive forms, bookmarks, signatures and other document-level features may not survive page copying. Keep originals. Splitter extracts the selected pages into one output, not separate files. Reordering uses a numeric list, not thumbnails.

## Future roadmap

These are planned extensions, not current functionality:

- JSON ↔ CSV converter
- XML, SQL, HTML, CSS, and JavaScript formatters
- Slug converter
- CSS gradient and box shadow generators
- HTTP status code reference and MIME type lookup
- Fake data generator and text statistics
- Developer resources: VS Code extension finder, Git cheat sheet, package.json analyzer
- File tools: ZIP utilities, CSV utilities, audio metadata, additional image utilities
- PDF → Images with a separately evaluated, lazy-loaded rendering engine

## Contributing

Keep utilities local, dependencies small, metadata centralized, and malformed input recoverable. Add keyboard-accessible controls with visible focus. Include meaningful tests for new transformations and edge cases. Run lint, type checks, unit tests, browser tests, formatting checks, and a production build before proposing a change. Document any new limits or browser requirements.

## License

License to be selected by the project owner. No open-source license has been granted yet.
