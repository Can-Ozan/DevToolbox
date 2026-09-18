# DevToolbox v3.0

> A local-first developer workspace with **29 tools**, image & PDF utilities, and a reusable browser file vault.

[![Deploy DevToolbox to GitHub Pages](https://github.com/Can-Ozan/DevToolbox/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Can-Ozan/DevToolbox/actions/workflows/deploy-pages.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tools](https://img.shields.io/badge/Tools-29-7C3AED)

### 🔗 Live Demo
**https://can-ozan.github.io/DevToolbox/**

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
- Favorites and recent tools
- **Ctrl/Cmd + K** command palette
- Light, dark and system themes
- Responsive desktop/mobile interface
- Keyboard-friendly and accessibility-focused controls
- Lazy-loaded tools and workers
- No authentication, remote database or conversion API required

---

## 🗂️ Workspace

The v3 Workspace turns DevToolbox into more than a collection of isolated utilities.

You can:

- Import files from your device
- Drag & drop files
- Save generated outputs to Workspace
- Reuse an output directly in another compatible tool
- Pin important files
- Preview supported images and text files
- Download or delete files
- View file size, MIME type, source tool and creation time
- Check approximate browser storage usage

### Example workflow

```text
JPG
 ↓
Image Format Converter
 ↓
Save to Workspace
 ↓
Image Compressor
 ↓
Choose from Workspace
 ↓
Download
```

Another example:

```text
Images
 ↓
Images → PDF
 ↓
Save to Workspace
 ↓
PDF Splitter
 ↓
Extract selected pages
```

Workspace files are stored in **IndexedDB** in the current browser profile. Browser data can be cleared, so important files should still be downloaded and backed up normally.

---

## 🧰 Tools

### Core developer tools

| Tool | Main capabilities |
| --- | --- |
| JSON Formatter | Format, minify, validate, indentation, copy and download |
| Base64 Encoder / Decoder | Unicode-safe UTF-8 encode/decode |
| UUID Generator | Secure UUID v4 generation in batches |
| JWT Decoder | Decode header/payload and inspect standard claims |
| URL Encoder / Decoder | Full URL and component encoding |
| Unix Timestamp Converter | Seconds, milliseconds, local time, UTC and ISO |
| Hash Generator | SHA-1, SHA-256, SHA-384 and SHA-512 |
| Regex Tester | Matches, captures, flags, highlighting and timeout protection |
| Password Generator | Secure configurable 8–128 character passwords |
| Color Converter | HEX, RGB and HSL conversion |
| Lorem Ipsum Generator | Paragraph, sentence and word generation |
| Text Diff Checker | Side-by-side and unified line diffs |

### v2 tools

| Tool | Main capabilities |
| --- | --- |
| JSON ↔ YAML Converter | Two-way conversion, validation and downloads |
| Markdown Previewer | Live GFM preview, tables, task lists and code blocks |
| Cron Expression Builder | Visual 5-field builder, presets and descriptions |
| QR Code Generator | Local QR generation with PNG download |
| Case Converter | 10 case formats including camel, snake and kebab |
| Number Base Converter | Binary, octal, decimal and hexadecimal using BigInt |
| Color Contrast Checker | WCAG AA/AAA contrast checks |
| URL Parser | URL components, query parameters and secret redaction |

### v3 image tools

| Tool | Main capabilities |
| --- | --- |
| Image Format Converter | PNG / JPEG / WebP conversion with JPEG background control |
| Image Compressor | JPEG/WebP quality controls and size comparison |
| Image Resizer | Width, height, aspect ratio, percentage and presets |
| Image Rotate / Flip | 90° / 180° / 270° and horizontal/vertical flips |
| Image Metadata Viewer | Filename, MIME type, size, width, height and aspect ratio |

### v3 PDF tools

| Tool | Main capabilities |
| --- | --- |
| PDF Merger | Merge multiple PDFs in a chosen order |
| PDF Splitter | Extract ranges such as `1-3,5,8-10` |
| PDF Page Reorder | Reorder or omit pages using a numeric page list |
| Images → PDF | PNG/JPEG/WebP to A4 PDF with fit and margin controls |

> PDF → Images is not included in v3.0. Reliable browser-side PDF rendering would require an additional rendering engine such as PDF.js.

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

The hosting provider can still receive normal requests for the application files themselves. DevToolbox does not include tool input/file contents in those requests.

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

Limits are browser-side safety boundaries, not guarantees that every device can comfortably process the maximum size.

---

## 🧪 Quality & testing

The current v3 release was verified with:

- **129 unit tests**
- **39 Chromium E2E tests**
- TypeScript type checking
- ESLint
- Production build verification
- Responsive coverage
- Accessibility checks
- Workspace persistence/failure scenarios
- Image and PDF workflows
- Mobile navigation regression tests
- External-request checks for local processing flows

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

Then open the local Vite URL shown in the terminal.

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

---

## 🌐 Deployment

DevToolbox is deployed with **GitHub Pages**:

**https://can-ozan.github.io/DevToolbox/**

The repository includes GitHub Pages support for:

- Vite base path
- React Router basename
- SPA `404.html` fallback
- `.nojekyll`
- bundled workers and assets

The application does not require server-side environment variables.

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

The tool registry remains the source of truth for search, categories, favorites, recent tools, routing and Workspace compatibility.

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
