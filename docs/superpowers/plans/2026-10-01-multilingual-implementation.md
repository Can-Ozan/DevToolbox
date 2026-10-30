# DevToolbox Multilingual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after the user authorizes implementation. Steps use checkbox (`- [ ]`) syntax for tracking. Recommend inline execution to conserve quota; do not automatically delegate.

**Goal:** Localize the existing 37-tool DevToolbox interface into English, Turkish, German and Spanish while preserving its UI, user data, offline behavior and deployment.

**Architecture:** Use i18next and react-i18next with typed English fallback resources and local dynamic imports for the other three languages. Reuse existing local preferences, native Settings controls and dialogs. Keep registry IDs, technical values, canonical English SEO, routes and service worker activation semantics stable.

**Tech stack:** Existing React 19, TypeScript 6, Vite 8, Vitest, Playwright and Workbox; proposed i18next 26.4.2 and react-i18next 17.0.15, subject to a fresh pre-install audit.

**Spec:** [Multilingual design](../specs/2026-10-01-multilingual-design.md).

## Recorded pre-implementation baseline

**Implementation authorized 2026-10-02.** Resume from the checkpoint table and execution evidence below. Preserve completed work.

- Workspace: `C:\Users\ASUS\Documents\GitHub\DevToolbox`.
- Current branch: `feat/pwa-release-notes-clean`; HEAD inspected at `15bc48e`.
- Upstream is one commit ahead: `576bbc2`, the CI timeout adjustment. The working tree already has that same `.github/workflows/verify.yml` change. Preserve it; do not reset, revert or stash it away blindly.
- Existing untracked design document is intentional. This plan is also intentionally uncommitted.
- No multilingual product code, dependency installation or feature branch exists yet.
- Previously reported product baseline: 322 unit tests, Chromium 98 and WebKit 29 passed. These are historical results, not verification of multilingual work.
- Read-only preparation checked Settings at 320/375/768/1440px in light/dark: eight overflow checks passed; axe found no violations at 375px in either theme. Preview server and screenshots were removed.
- Context7 documentation and Better Design/Lumen guidance were consulted. NPMScan found no known vulnerabilities across five packages in the proposed dependency graph. Recheck actual versions/scripts before installation; this is not a permanent security guarantee.

## Global constraints

- English is the canonical fallback; supported language codes are exactly `en`, `tr`, `de`, `es`.
- Preserve version 4.1.0 and the 37-tool registry unless the user separately requests a release bump. Collections is not a tool.
- Do not redesign, replace components unnecessarily, change tool algorithms or weaken safety limits/tests.
- No backend, accounts, cloud synchronization, analytics, tracking, translation API or runtime release lookup.
- No translated routes, language URL parameters or canonical/sitemap/robots changes. Preserve `/DevToolbox/` base paths.
- Do not translate user file/collection names, code, JSON keys, Markdown content, package/script values, MIME types, URLs, identifiers, hashes, tokens or machine-readable output schemas.
- Keep historical README release notes unchanged.
- No forced reload or tool remount during language switching. Existing jobs, inputs, results and Workspace state survive.
- No UI library, detector package or HTTP translation backend. Only the two audited i18n runtime dependencies are proposed.
- Keep native focus/keyboard behavior, theme tokens, PWA update consent, Later, worker/object URL cleanup and multi-tab protection.
- Do not commit, push, merge or create a PR automatically. Saving files/checkpoints is sufficient for local resumption.

## Review focus

1. Rapid locale changes or a failed chunk load must not apply an older choice, blank the app or clear a tool's inputs (Phase 1 tests).
2. Old/malformed preferences, denied storage and an explicit English choice on a Turkish browser must remain safe and deterministic (Phase 1 tests).
3. Translation must not treat a hostile filename, collection name or parser error containing user text as markup or a translation key (Phases 2–3 tests).
4. Unknown incoming PWA releases must show their own English fallback, not this tab's older translated release (Phase 4 tests).
5. A locale never selected online must load after the origin goes offline; long German strings must remain usable at 320px (Phases 4–6 tests).

## Resume protocol and evidence

Before **every** resumed session:

```powershell
git status --short --branch
git log -3 --oneline
git diff --stat
git diff --check
```

Read the spec, this plan and the checkpoint table below. Inspect existing files/diff before implementing the next unchecked step. Never infer completion from a checkbox alone: verify that its named files and recorded results exist. Preserve unrelated changes and permanent tests.

Before the first implementation edit, reconcile the identical local/upstream CI patch without dropping it. Compare `.github/workflows/verify.yml` with the upstream file; then create `codex/multilingual-foundation` from the verified release-notes baseline, carrying the spec/plan forward. If the remote branch has changed or merged since planning, inspect it first and record the chosen base SHA. Do not switch or edit `main`, and do not force a checkout across differences.

At each checkpoint, update this table **on disk** with changed files, exact commands, exit codes/test counts, unresolved issues and the next action. A session may stop between checkpoints; record partial edits and failing tests explicitly. Uncommitted files persist locally but are not a remote backup. Do not delete these documents or use `git clean` during cleanup.

| Checkpoint | Status      | Evidence / next action                                                                                                                                                                             |
| ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan       | Complete    | Approved spec and plan preserved; implementation authorized 2026-10-02                                                                                                                             |
| 1A / 1B    | Complete    | 343 unit tests; 4 foundation Chromium tests; static gate passed                                                                                                                                    |
| 2A         | Complete    | Shell/Settings and keyboard/SEO regression verification passed                                                                                                                                     |
| 2B         | Complete    | 21 focused / 355 full unit tests; 21 Chromium tests; static gate passed                                                                                                                            |
| 2C         | Complete    | 88 focused unit tests; Chromium 11/11; WebKit 13/13; static gate passed                                                                                                                            |
| 3A         | Complete    | 125 focused / 363 full unit tests; Chromium 16/16; WebKit 5/5; static gate passed                                                                                                                  |
| 3B         | Complete    | 102 focused tests; 5 distinct Chromium checks including lifecycle/in-flight switch; static gate passed                                                                                             |
| 3C         | Complete    | 54 focused tests; 366 full unit tests; typecheck/lint/format/diff gates passed; Chromium blocked by missing browser executable                                                                     |
| 4A / 4B    | In progress | PWA/release UI, runtime error descriptors, ConnectionStatus and validated optional v4.1 release localizations implemented; unit tests pass; browser/offline verification blocked by Playwright CDN |
| 5A / 5B    | In progress | Resource parity/token/plural tests pass; coverage inventory in `docs/i18n-coverage.md`; Playwright responsive/accessibility matrix remains blocked                                                 |
| 6A / 6B    | Not started | Full regression, root/Pages verification                                                                                                                                                           |

### Resume evidence — 4A/4B and 5A/5B

- Added `src/i18n/resources.test.ts`: all four bundles are checked for key
  parity, non-empty translations, interpolation token parity and paired plural
  forms; English fallback is checked with a sparse runtime bundle.
- Localized `src/pwa/ConnectionStatus.tsx` and added the three corresponding
  keys to every locale.
- Focused verification: `npm test -- --run src/i18n/resources.test.ts src/pwa src/data/releases.test.ts`
  passed (5 files, 25 tests); `npm run typecheck` passed.
- Added `docs/i18n-coverage.md` with all 37 stable registry IDs and the
  deliberate technical/user-content exceptions.
- Added `src/data/localizedRelease.ts` and factual Turkish, German and Spanish
  v4.1.0 release payloads. Legacy English-only releases, unknown versions and
  malformed optional localization data fall back to the incoming English
  content; version/date and worker validation remain unchanged.
- Release localization tests plus PWA/data/i18n focused verification passed
  (11 files, 65 tests).
- Responsive and axe checks already exist in `tests/app.spec.ts` and
  `tests/accessibility.spec.ts`; they remain unexecuted because Playwright
  browser binaries could not be downloaded from the CDN.

**Exact resume point:** attempt the Playwright matrix again (including offline
PWA and Pages/base-path suites), then run the final static/unit/build gates.

### Common gate after each implementation checkpoint

Run the checkpoint's focused tests first, then:

```powershell
npm run lint
npm run typecheck
npm run format:check
git diff --check
```

Expected: exit 0 for each. Format only files intentionally changed in the checkpoint. Do not run repository-wide `prettier --write .`. Record failures instead of advancing as complete. The full browser suites run in Phase 6, not after every text edit.

## Phase 1 — i18n foundation

**Depends on:** User authorization to begin implementation; verified feature-branch base. Adds only audited i18next/react-i18next dependencies.

**Create:**

- `src/i18n/language.ts` — supported union, native language names, pure detection.
- `src/i18n/resources/en.ts`, `tr.ts`, `de.ts`, `es.ts` — nested semantic resource groups; non-English modules are dynamically imported.
- `src/i18n/i18next.d.ts` — module augmentation from the English schema.
- `src/i18n/index.ts` — instance, initialization, loading, switch ordering and preference subscription cleanup.
- `src/i18n/LanguageSettings.tsx` — existing-styled, labeled native select and loading/error status.
- `src/i18n/language.test.ts`, `runtime.test.ts` — isolated unit tests.
- `src/storage/preferences.test.ts` — additive language persistence tests.
- `tests/i18n.spec.ts` — browser tests grouped by `foundation`, `shell`, `workspace`, `coverage` in their titles.

**Modify:** `package.json`, `package-lock.json`, `src/storage/preferences.ts`, `src/main.tsx`, `src/pages/Settings.tsx`, `playwright.config.ts`. Add `**/i18n.spec.ts` to the existing Firefox/WebKit testMatch lists; preserve existing entries.

**Interfaces:**

- `Language = 'en' | 'tr' | 'de' | 'es'` and `isLanguage(value: unknown): value is Language`.
- `resolveLanguage(explicit: unknown, browserLanguages: readonly string[], browserLanguage?: string): Language`. Valid explicit preference wins; otherwise primary browser language's base subtag, then English. Do not scan secondary languages ahead of the primary-language fallback specified in the spec.
- Add `language?: Language` to `Preferences`, `preferences.setLanguage(language: Language | undefined)`, and read/subscribe access to the existing store for initialization/synchronization. Keep its version/key unchanged.
- `initializeI18n(): Promise<void>` initializes English and attempts the selected locale before rendering, recovering to English on failure.
- `changeAppLanguage(language: Language): Promise<boolean>` loads resources, ignores superseded requests, activates and persists only a successful latest explicit choice. Runtime application of a storage event must not write the same preference back repeatedly.
- English resources expose nested `common`, `shell`, `settings`, `workspace`, `tools`, `pwa` and `releases` groups in one default namespace. Use typed `useTranslation` calls; non-English modules import types only from English. Set English fallback and reject empty translations.

### 1A — detection and safe preference storage

- [x] Write failing tests: `tr-TR => tr`, `de-AT => de`, `es-MX => es`, `fr-FR => en`; explicit `en` beats `tr-TR`; malformed/old storage preserves existing preferences; theme changes do not persist a detected language.
- [x] Audit exact proposed dependencies and scripts before installation; record findings. Install only after the audit. Save exact resolved versions in the lockfile.
- [x] Implement pure detection and additive preference support. Reset must explicitly remove/undefine `language`; merging defaults that omit the field would accidentally retain the previous choice.
- [x] Run `npm test -- src/i18n/language.test.ts src/storage/preferences.test.ts`; expect all cases passing. Run the common gate and save checkpoint.

### 1B — runtime and selector

- [x] Write failing tests for English missing-key/empty-value fallback, typed invalid-key rejection, document `lang`, failed loading, `tr → de` out-of-order resolution, denied storage, reset, cross-tab synchronization and cleanup.
- [x] Implement local dynamic imports and lifecycle. Do not key providers/components by locale or introduce language-driven Suspense remounts. Keep user input state mounted.
- [x] Add the selector before Appearance with English/Türkçe/Deutsch/Español, associated label, option language attributes and existing focus/control styles.
- [x] Add browser tests for switching/persistence/keyboard behavior and another tab retaining unsaved JSON input while its language changes.
- [x] Run focused unit files above plus `src/i18n/runtime.test.ts` and `npx playwright test tests/i18n.spec.ts --project=chromium --grep foundation`; run the common gate.

**Done:** Four languages can be selected and persisted without reload or input loss; old preferences remain valid; English fallback always works; no remote translation request. This phase localizes the selector and foundational messages only and must not claim complete UI coverage.

## Phase 2 — shell, dashboard, Settings and Workspace

**Depends on:** Phase 1 runtime and types. No new dependencies or IndexedDB schema version.

**Modify exact files:**

- Shell/shared: `src/App.tsx`, `src/components/Layout.tsx`, `ui.tsx`, `ToolCard.tsx`, `ToolLayout.tsx`, `OverflowMenu.tsx`.
- Pages: `src/pages/Dashboard.tsx`, `AllTools.tsx`, `Collections.tsx`, `Settings.tsx`, `NotFound.tsx`, `ToolPage.tsx`.
- Discovery: `src/features/CommandPalette.tsx`, `src/registry/tools.ts`, `discovery.ts`, `discovery.test.ts`.
- Workspace: `src/workspace/WorkspacePage.tsx`, `WorkspaceCollections.tsx`, `WorkspaceActions.tsx`, `FileControls.tsx`, `FileThumbnail.tsx`, `JsonFileInput.tsx`, `StorageMeter.tsx`, `ClearWorkspaceButton.tsx`, `ProcessingStatus.tsx`, `workspaceStore.ts`, `workspaceUtils.ts`.
- All four `src/i18n/resources/{en,tr,de,es}.ts`; `tests/i18n.spec.ts`.
- Scoped wrapping only when tests show a problem: `src/styles/shell.css`, `pages.css`, `workspace.css`, `tools.css`. Preserve `tokens.css`.

**Create:** `src/i18n/toolLabels.ts`, `toolLabels.test.ts`, `src/i18n/messages.ts`, `messages.test.ts`.

**Interfaces:** `getToolText(tool: ToolDefinition, language: Language): { name: string; description: string; keywords: readonly string[] }` resolves display text by stable tool ID with canonical English fallback. A corresponding `getCategoryLabel(category: ToolCategory, language: Language): string` never changes category URLs. `messages.ts` defines serializable, typed application message descriptors with key/parameters/English fallback and a renderer; pass user values as escaped interpolation data, never keys or HTML. Workers import descriptor types only.

### 2A — shell and Settings

- [x] Add browser assertions for translated accessible names, mobile drawer, confirmation dialogs, document language and preserved English canonical/SEO values.
- [x] Localize shared actions, counters/plurals, headings, empty states, error boundary and Settings. Keep native Modal lifecycle/focus logic.
- [x] Separate translated breadcrumb rendering from canonical metadata and route-only scroll/drawer effects. Language switching must not count another tool visit, navigate or reset scroll.
- [x] Run `npx playwright test tests/i18n.spec.ts --project=chromium --grep shell` and `npx playwright test tests/mobile-navigation.spec.ts tests/growth-seo.spec.ts --project=chromium`; run common gate.

### 2B — dashboard and discovery

- [x] Add unit tests proving canonical `json` still selects JSON Formatter and `workspace` remains the existing action; translated queries also find the expected tool, English technical aliases still match, and localized name sorting is deterministic.
- [x] Localize labels through stable IDs without changing lazy component identity, compatibility matching, URLs or stored favorite/recent/usage IDs. Translate action matching without shifting exact-match priorities.
- [x] Run `npm test -- src/i18n/toolLabels.test.ts src/registry/discovery.test.ts` and `npx playwright test tests/v41.spec.ts tests/i18n.spec.ts --project=chromium`; run common gate.

### 2C — Workspace and Collections

- [x] Add tests for create/rename/move/bulk move/delete, selection menus, labels in list/grid, reload and backup/restore while language differs from the creation language. Include a filename and collection name containing `<img onerror=...>` and verify literal text, no markup execution or translation.
- [x] Localize application copy and stored UI notices through message descriptors. User names, persisted Blobs, metadata and backup schemas remain unchanged. Existing DB and archive algorithms are not localization targets.
- [x] Run `npm test -- src/workspace src/lib/archive.test.ts src/i18n/messages.test.ts` and `npx playwright test tests/i18n.spec.ts --project=chromium --grep workspace`; also run `npx playwright test tests/v41.spec.ts --project=webkit`. Run common gate.

**Done:** Shell, discovery, Settings and Workspace are localized in all four languages; existing English regressions remain valid; data/backup compatibility and modal behavior pass. Any untranslated tool-specific copy remains explicitly scheduled for Phase 3.

## Phase 3 — tool and common UI localization

**Depends on:** Phases 1–2 resource, metadata and message interfaces. No new dependencies.

**Modify shared files:** `src/components/TransformTool.tsx`, `ui.tsx`, `ToolLayout.tsx`; `src/workspace/FileControls.tsx`, `ProcessingStatus.tsx`; four locale resource files and `src/i18n/messages.ts`.

**Create tests:** `src/i18n/toolMessages.test.ts`, `tests/i18n-tools.spec.ts`. Add the new browser file to Firefox/WebKit testMatch in `playwright.config.ts`.

### 3A — text and developer tools

**Exact tool files:**

`src/tools/json/JsonTool.tsx`, `base64/Base64Tool.tsx`, `uuid/UuidTool.tsx`, `jwt/JwtTool.tsx`, `url/UrlTool.tsx`, `timestamp/TimestampTool.tsx`, `hash/HashTool.tsx`, `regex/RegexTool.tsx`, `password/PasswordTool.tsx`, `color/ColorTool.tsx`, `lorem/LoremTool.tsx`, `diff/DiffTool.tsx`, `json-yaml/JsonYamlTool.tsx`, `markdown/MarkdownTool.tsx`, `cron/CronTool.tsx`, `qr/QrTool.tsx`, `case/CaseTool.tsx`, `number-base/NumberBaseTool.tsx`, `contrast/ContrastTool.tsx`, `url-parser/UrlParserTool.tsx`, `json-csv/JsonCsvTool.tsx`, `xml/XmlTool.tsx`, `code-formatter/CodeFormatter.tsx` (paths after the first are also under `src/tools/`).

- [x] Add table-driven browser tests tagged `text`: all registered text/developer tools render localized controls; representative valid/invalid/empty/Unicode input, copy and downloads still work. Assert JSON/code/output values unchanged across a cross-tab locale switch.
- [x] Translate tool-owned controls, descriptions, validation messages and help text. Do not translate Markdown task text or replace task-list accessible names; keep sanitization.
- [x] For errors raised below the UI, change only presentation metadata where needed in these exact files: `src/lib/encoding.ts`, `timestamp.ts`, `random.ts`, `regex.ts`, `color.ts`, `diff.ts`, `jsonYaml.ts`, `cron.ts`, `numberBase.ts`, `contrast.ts`, `urlParser.ts`, `jsonCsv.ts`, `jsonFile.ts`, `xml.ts`, `codeFormat.ts`, `processing.ts`. Keep their computation and canonical English error fallback unchanged. `lorem.ts` and `caseConverter.ts` outputs are user-requested transformations, not UI text to translate.
- [x] Preserve error descriptors through `src/lib/workerJob.ts`, `src/tools/code-formatter/code.worker.ts` and `src/tools/regex/regex.worker.ts` only where needed. Do not import locale bundles into workers.
- [x] Run `npm test -- src/i18n/toolMessages.test.ts src/lib/tools.test.ts src/lib/expansion.test.ts src/lib/developerTools.test.ts src/lib/workerJob.test.ts` and `npx playwright test tests/i18n-tools.spec.ts --project=chromium --grep text`; run common gate.

### 3B — image and PDF tools

**Exact files:** `src/tools/image/ImageTool.tsx`, `src/tools/image-cropper/ImageCropper.tsx`, `src/tools/pdf/PdfTool.tsx`, `src/tools/pdf-to-images/PdfToImages.tsx`. Conditional message-boundary edits only: `src/lib/imageFiles.ts`, `pdfFiles.ts`, `pdfPages.ts`, `crop.ts`, `src/tools/pdf/pdfTypes.ts`, `pdfClient.ts`, `pdf.worker.ts`, `src/tools/pdf-to-images/pdfRenderer.ts`.

- [x] Add browser cases tagged `files` for localized processing, cancellation, results, Workspace handoff and invalid inputs. Locale changes during a job must not cancel/restart it or alter output dimensions/content.
- [x] Translate application-owned status/error/controls while preserving rendering, white PDF backgrounds, MIME handling, download timing and object URL/worker cleanup.
- [x] Run `npm test -- src/i18n/toolMessages.test.ts src/lib/fileTools.test.ts src/lib/conversion.test.ts src/tools/pdf/pdfClient.test.ts src/tools/pdf-to-images/pdfRenderer.test.ts src/workspace/download.test.ts` and `npx playwright test tests/i18n-tools.spec.ts tests/object-urls.spec.ts --project=chromium --grep "files|object|PDF|crop"`; run common gate.

### 3C — archive and inspection tools

**Exact files:** `src/tools/zip/ZipTool.tsx`, `src/tools/file-inspector/FileInspector.tsx`, `src/tools/package-json/PackageJsonTool.tsx`. Message/diagnostic boundaries only: `src/tools/zip/archiveClient.ts`, `archive.worker.ts`, `src/lib/archiveTypes.ts`, `archive.ts`, `src/tools/file-inspector/inspection.ts`, `src/tools/package-json/analyzePackage.ts`.

- [x] Add cases tagged `inspection` for localized compatibility reasons, archive safety errors and package diagnostics. Preserve actual filenames, MIME types, package names, versions, commands, JSON export keys and local-only processing.
- [x] Localize human-facing copy/summary without altering archive/analysis algorithms. Preserve English fallback for unknown third-party diagnostics; document those exceptions instead of guessing translations.
- [x] Run `npm test -- --run src/i18n/toolMessages.test.ts src/lib/archive.test.ts src/tools/file-inspector/inspection.test.ts src/tools/package-json/analyzePackage.test.ts`: PASS 54/54. `npx playwright test tests/i18n-tools.spec.ts --project=chromium`: blocked before execution because Chromium executable is absent; `npx playwright install chromium firefox webkit` also failed on CDN timeouts. Common gates: lint, typecheck, format:check and git diff --check PASS.

### 3C COMPLETE — 2026-10-10

- Localized ZIP controls and serializable archive safety descriptors; worker protocol, limits, filenames, MIME values and archive contents remain unchanged.
- Localized Smart File Inspector labels, detection presentation and handoff copy; unknown parser/user diagnostics remain literal.
- Localized Package.json Analyzer controls, summaries and live descriptors; exported JSON remains canonical and package names, versions, commands and keys remain unchanged.
- Focused unit tests passed 54/54; full `npm test` passed 366/366. Root and `/DevToolbox/` production builds passed. Browser verification is pending only because Playwright engines could not be downloaded in this Windows environment.
- Next: finish 4A/4B release payload/localized release-content audit, then resource/visual/accessibility audit and final browser matrix once engines are available.

**Done:** All 37 registry tools have localized application controls and metadata; pure outputs and technical identifiers remain intact; error handling, safety limits and cleanup tests pass. Conditional files above are not permission for unrelated refactors—record which needed edits.

## Phase 4 — PWA and release notes localization

**Depends on:** Foundation and message descriptors. No new dependencies; English worker payload remains backward compatible.

**Modify:** `src/pwa/PwaControls.tsx`, `ConnectionStatus.tsx`, `pwaStore.ts`, `releaseMessage.ts`, `PwaControls.test.ts`, `releaseMessage.test.ts`, `pwa.test.ts`; `src/components/ReleaseNotes.tsx`; `src/data/releases.ts`, `releases.test.ts`; four locale resources; `vite.config.ts`; `tests/release-notes.spec.ts`, `tests/pwa.spec.ts`.

**Create:** `src/data/releaseTranslations.ts`, `localizedRelease.ts`, `localizedRelease.test.ts`; `tests/i18n-pwa.spec.ts` and include it in Firefox/WebKit testMatch.

**Interface:** Keep the existing English `Release` fields required. Add optional `localizations` keyed by supported languages, containing translated title/features/improvements/fixes but not version/date. `localizeRelease(release: Release, language: Language): Release` uses only that release's validated localization; otherwise it returns the incoming English content. It must never resolve an unknown incoming release against the running tab's older changelog.

### 4A — messages and factual release content

- [ ] Add tests for empty sections, localized labels/date, per-section preview limits, all-changes modal, exact factual v4.1 translations, malformed optional localization and legacy English-only payloads.
- [x] Translate PWA status/errors/consent text and Settings release entry. Existing immutable incoming-worker protocol, validation and timeout/port cleanup remain unchanged; optional per-release localized payloads are not needed for the current English-only 4.1.0 payload.
- [ ] Run `npm test -- src/data src/pwa` and `npx playwright test tests/release-notes.spec.ts tests/i18n-pwa.spec.ts --project=chromium`; run common gate.

### 4B — offline and update safety

- [ ] Test an unknown incoming version with English-only notes, switching while its notice is open, Later, explicit activation consent, pending processing, unsaved inputs across two tabs, focus restore and body scroll.
- [ ] Verify service worker precache includes all locale chunks and changing to a never-used locale works after stopping a private test origin. Reuse the existing origin-stop pattern for WebKit rather than weakening offline assertions or relying solely on its known offline-emulation limitation.
- [ ] Record requests: only same-origin static assets; no remote translation, telemetry or release lookup. Verify worker scope/manifest base behavior is unchanged.
- [ ] Run `npx playwright test tests/i18n-pwa.spec.ts tests/release-notes.spec.ts --project=webkit`; run common gate.

**Done:** Localized PWA/release UI works online/offline, including unknown-version fallback and older payloads; activation and cleanup remain unchanged.

## Phase 5 — German, Spanish and Turkish coverage audit

**Depends on:** Phases 1–4. No new dependencies or features.

**Create:** `src/i18n/resources.test.ts`, `docs/i18n-coverage.md`.

**Modify:** Four resource files; `tests/i18n.spec.ts`, `tests/i18n-tools.spec.ts`, `tests/i18n-pwa.spec.ts`. If real overflow is found, only affected selectors in `src/styles/shell.css`, `pages.css`, `workspace.css`, `tools.css`, `conversion.css`, or `src/tools/markdown/markdown.css`. Change the owning UI file listed in Phases 2–4 only to remove missed application-owned literals; keep an exact per-file audit log.

### 5A — resource and literal coverage

- [ ] Add resource tests requiring every English key in each locale, non-empty values, matching interpolation placeholders and correct locale plural forms for counts 0/1/2/many. Keep a deliberately sparse resource fixture to test English runtime fallback separately from shipped completeness.
- [ ] Audit JSX text, aria-label/title/placeholder attributes, toast/error/status strings and registry metadata. Classify remaining English as technical/user content, unknown third-party diagnostic, or a defect. No broad regex replacement of source or DOM text.
- [ ] Verify Turkish characters/casing, German compounds and Spanish accents; keep user data out of translation keys. Review factual release translations against the exact English source.
- [ ] Run `npm test -- src/i18n src/data` and common gate. Record coverage by surface and all 37 tool IDs in `docs/i18n-coverage.md`.

### 5B — responsive and accessibility matrix

- [ ] At widths 320/375/768/1440, exercise each of four languages in light and dark: 32 locale/theme/viewport combinations per audited surface. Include Settings selector, drawer, search, dashboard, Workspace grid/list/Collections, tool editors, image/PDF/ZIP result controls and release/update dialogs.
- [ ] Assert `document.documentElement.scrollWidth <= innerWidth`, controls within their containers, reachable dialog/drawer actions, visible focus, proper names and correct `html[lang]`. Run axe on Settings/search/Workspace/release views in both themes. Do not use screenshots as the only assertions.
- [ ] Run `npx playwright test tests/i18n.spec.ts tests/i18n-tools.spec.ts tests/i18n-pwa.spec.ts --project=chromium` and repeat with `--project=webkit`; run common gate.

**Done:** No unexplained untranslated application strings, missing shipped keys, axe violations or localization overflow. Allowed verbatim technical/third-party strings are listed precisely. No visual identity changes.

## Phase 6 — full regression and deployment verification

**Depends on:** All previous checkpoints passing. No new product code. Fix only discovered regressions and rerun affected tests plus static checks.

**Create:** `playwright.pages.config.ts`, `tests-pages/i18n.spec.ts` for permanent production Pages smoke coverage, outside the default `tests/` directory so root suites do not accidentally run base-specific tests.

**Modify documentation:** `README.md` current usage/privacy/language instructions only; `docs/i18n-coverage.md`; this plan's checkpoint/evidence table. Preserve historical README sections.

**Pages configuration contract:** `testDir: './tests-pages'`; use the existing installed browsers; preview port from `DEVTOOLBOX_TEST_PORT` or 4173, `reuseExistingServer: false`; baseURL and server readiness URL end in `/DevToolbox/`. The web server starts the already-built `dist` with `npm run preview`, without silently rebuilding at `/`. Tests navigate using relative paths so they retain the base prefix. Keep the root Playwright configuration and its complete project lists.

### 6A — complete checks

- [ ] Run all commands below separately and record actual counts/exit codes. Do not interpret an environment launch failure as an app failure or as a pass.

```powershell
npm run lint
npm run typecheck
npm test
npm run format:check
git diff --check
npx playwright test --project=chromium
npx playwright test --project=webkit
npx playwright test --project=firefox
npm run build
```

Expected: exit 0 and no skipped coverage added. If Firefox fails before execution with Windows `spawn UNKNOWN`, record `BLOCKED BY ENVIRONMENT`, preserve its tests, and separately report any verified Linux CI result. Do not bypass App Control. Retain traces for any real failure until diagnosed.

### 6B — Pages, performance and final review

- [ ] Record root build initial JavaScript/gzip sizes against the pre-implementation baseline. Verify non-English catalog contents live in separate chunks, not the critical bundle; inspect English resource/runtime overhead and explain the measured delta. Avoid speculative bundling refactors.
- [ ] Build Pages in PowerShell with the exact environment override, restoring any previous value afterward:

```powershell
$previousBasePath = $env:VITE_BASE_PATH
try {
  $env:VITE_BASE_PATH = '/DevToolbox/'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'GitHub Pages build failed' }
} finally {
  if ($null -eq $previousBasePath) {
    Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
  } else {
    $env:VITE_BASE_PATH = $previousBasePath
  }
}
npx playwright test --config=playwright.pages.config.ts --project=chromium
npx playwright test --config=playwright.pages.config.ts --project=webkit
```

- [ ] Pages smoke verifies `/DevToolbox/`, `tools`, `tools/json`, `tools/file-inspector`, `tools/package-json`, `workspace`, `settings`; manifest start_url/scope; worker scope; translated chunks and release script; canonical URLs; update consent; offline reload and never-before-selected language; zero broken assets, page errors or unexpected external requests.
- [ ] Review `git status --short`, `git diff --check`, `git diff --stat`, `git diff`, and all untracked implementation files. Review the exact installed lockfile security results and application-owned/third-party untranslated exceptions. Use Code Review capabilities if they support this local diff; otherwise report a focused manual review, not a fictional plugin result.
- [ ] Remove only temporary screenshots, reports from successful runs, debug scripts and processes created for this task. Preserve tests, these documents and failure evidence still needed to diagnose unresolved issues.
- [ ] Update current README instructions and write the user's requested multilingual audit with actual test counts, browser limitations, both builds, performance deltas and remaining issues. Finish `READY TO COMMIT AND PUSH` only if no product blocker remains; otherwise `NOT READY — FIXES REMAIN`. Do not commit or push automatically.

**Done:** Full required local verification is recorded; Pages and PWA offline/update checks pass; translated UI retains all 37 tools and existing data contracts; no unresolved product regression. Firefox environment-only limitations are explicit, not hidden.

## Implementation handoff

Implementation is authorized. Re-read the current diff, checkpoint table and execution evidence before continuing. Preserve the existing CI edit and these documents; do not repeat completed checkpoints.

## Execution evidence — 2026-10-02

- Branch: `codex/multilingual-foundation`; base `15bc48e`.
- Ruling: preserve the current checkout and create the approved feature branch in place. Upstream `576bbc2` has the same 45-minute CI timeout but different comment text, so switching to it was safely refused by Git. The existing local CI patch is retained exactly; no force checkout, stash, reset or commit. Cost: upstream CI commit ancestry is not included, although its functional change remains present.
- Ruling: use this durable plan as the task ledger rather than commit-oriented shell helpers. User explicitly requires uncommitted checkpoints in the current working tree. All checkpoint results and deviations stay here.
- Shared-interface preflight: language/preferences feeds runtime; runtime/resources feeds shell/tool/PWA localization; optional release localizations retain required English payload; test-file additions preserve Firefox/WebKit coverage. No conflicting contracts found.
- Pre-implementation root build: PASS (exit 0). Initial JavaScript measured from `dist/index.html`: index 340257 bytes / gzip 104648; workspaceUtils 2444 / 1256; ui 17710 / 6950; preload-helper 1218 / 688. Total 361629 bytes / gzip 113542. Compare Phase 6 against this baseline.
- NPMScan fresh audit: i18next 26.4.2 and react-i18next 17.0.15, MIT, no known vulnerabilities, no preinstall/install/postinstall scripts. Five resolved packages including transitive dependencies; zero unresolved, no truncation. Maintainer-only `prepare: husky` does not run when installing registry dependencies.
- 1A RED: focused tests failed as expected (missing language module; explicit language discarded; missing preference methods). Old-preference invalid-language fallback already passed.

- 1A COMPLETE: focused 14/14 and full 336/336 unit tests (21 files), lint/typecheck/format/diff checks all exit 0. Files: package.json/lock, src/i18n/language.ts and test, src/storage/preferences.ts and test. Next: 1B runtime and native selector.
- Existing unrelated advisory: npm audit reports low-severity serialize-javascript 7.1.1 (GHSA-gfhx-hw2g-v5hg), already in baseline lockfile via Workbox build tooling. No unrelated dependency upgrades performed.
- 1B RED/GREEN: 7 runtime tests first failed without runtime, now pass; browser verification pending.

- 1B COMPLETE: 343/343 unit tests (22 files), foundation Chromium 4/4, lint/typecheck/format/diff checks exit 0. Native selector, English fallback, lazy resource loading, persisted/cross-tab choices, document language and HMR cleanup added. Runtime RED→GREEN 7/7. Corrected a new test locator to the existing JSON input/output accessible names; no product workaround. Browser tests cover all four languages, both themes, widths 320/375/768/1440 and axe. Firefox/WebKit lists explicitly include i18n.spec.ts. Next: 2A shell/Settings.

- 2A COMPLETE: shell/Settings/common UI translated in four languages; route-only effects separated from translated labels. 343/343 unit tests, lint/typecheck/format/diff exit 0. Chromium: foundation 4/4, growth SEO 3/3, mobile navigation 2/2; new shell tests RED→GREEN 2/2 after fixing the test assumption about initial native-dialog focus (Close is first, then keyboard reaches Cancel; trap verified). Latest targeted shell rerun 2/2. Existing modal lifecycle unchanged. Files: src/App.tsx, Layout.tsx, ToolLayout.tsx, ui.tsx, Settings.tsx, NotFound.tsx, locale resources, tests/i18n.spec.ts. Tool/category names remain for 2B; embedded Workspace/PWA sections remain for 2C/4A.

- 2B resume after desktop restart: existing implementation preserved. All four catalogs, toolLabels.ts, search/sort integration, Dashboard/catalog/Favorites/Recent/related links/pinned tools and command palette are now wired. Focused discovery unit tests 21/21 and full unit suite 355/355 passed. Lint and typecheck passed; format check found only this updated plan. Browser discovery test had an ambiguous combobox locator; corrected to its accessible name. Diff review found translated React keys on two category lists; focused DOM/focus regression added before fixing. Final required browser/static gate is pending. No 2C or Phase 3 work started.

### 2B completion — 2026-10-02

- **COMPLETE.** The pending gate in the preceding progress entry is now resolved. All 37 tools have English/Turkish/German/Spanish discovery metadata. Dashboard, catalog, Favorites/Recent, category labels, pinned/related tools and command palette use localized display text. Registry IDs, route paths, lazy component identity and stored preference IDs remain unchanged. No dependencies added in 2B.
- Files changed for 2B: `src/i18n/resources/{en,tr,de,es}.ts`, `src/i18n/toolLabels.ts`, `src/i18n/toolLabels.test.ts`, `src/components/{Layout,ToolCard,ToolLayout}.tsx`, `src/pages/{Dashboard,AllTools,Collections,ToolPage}.tsx`, `src/features/CommandPalette.tsx`, `src/registry/{tools,discovery}.ts`, `tests/i18n.spec.ts`, and this plan. Earlier checkpoint changes and the pre-existing CI edit are preserved.
- Regression fixes: category controls retain stable React keys when their translated labels change (new DOM identity/focus test reproduced the failure before the fix). Exact localized navigation commands now precede incidental matches in tool descriptions: Turkish `ayarlar` opens Settings instead of Image Resizer. Displayed group order and keyboard result order remain aligned. English `json`, `workspace`, technical aliases and translated queries are covered.
- `npm test -- src/i18n/toolLabels.test.ts src/registry/discovery.test.ts`: **PASS**, exit 0, 21/21 tests in 2 files.
- `npm test`: **PASS**, exit 0, 355/355 tests in 23 files.
- `npx playwright test tests/v41.spec.ts tests/i18n.spec.ts --project=chromium`: **PASS**, exit 0, 21/21 tests (8 localization and 13 v4.1 regression tests). Includes discovery shortcuts, category focus preservation, shell/canonical metadata, unsaved inputs across tabs, Settings responsive/axe checks, Workspace Collections/backup workflows, Smart File Inspector and Package.json Analyzer. This run also built the root production app through the existing Playwright web-server command.
- `npm run lint`, `npm run typecheck`, `npm run format:check`, `git diff --check`: **PASS**, each exit 0. No CSS changes were necessary. Firefox/WebKit localization test inclusion remains intact; their runs and the Pages build are scheduled for later checkpoints, not claimed here.
- **Stop/resume point:** User requested completion of 2B only. No 2C or Phase 3 work started; no commit or push. Next session starts at **2C — Workspace and Collections**: inspect the Workspace/shared files listed in Phase 2 and the existing store/backup tests; write failing localized Workspace workflow and message-descriptor tests, including literal hostile names, before implementing `src/i18n/messages.ts` and translating Workspace copy. Preserve stored Blobs, user names, metadata, backup schemas and existing algorithms. Tool-specific controls remain for Phase 3; PWA/release text remains for Phase 4.
- Cleanup limitation: execution policy rejected removal of generated `playwright-report/` and `test-results/` folders without a detailed reason. Both remain Git-ignored; no permanent tests or source files were removed. Final working tree has 20 modified tracked files and 16 untracked source/test/documentation files, including earlier checkpoint work.

### 2C progress — 2026-10-02

- Resumed from verified 2B. New request authorizes remaining checkpoints in sequence; retain the existing plan IDs (2C, 3A–3C, 4A–4B, 5A–5B, 6A–6B) instead of renumbering completed history. Shared tool controls are included in 2C/3A; the later audit requests map to Phases 5–6.
- Ruling: add typed message descriptors at error construction sites in src/workspace/db.ts and collections.ts, plus a UI-only useMessageState hook. This is required for live translated validation/storage errors; transaction, validation, schema and backup behavior remain unchanged. No locale runtime is imported into workers by descriptors.
- New message tests initially failed on the missing module; 4/4 now pass. New browser matrix reproduced missing Turkish Workspace labels before UI wiring. Focused storage/archive/message tests pass 60/60; browser workflow and static gate pending. File menu uses stable optional IDs to preserve focus when labels change.

### 2C COMPLETE — 2026-10-03

- Resumed closing verification without rewriting completed code. Reviewed Workspace controls, message descriptors, stable menu keys and error-construction-only DB/collection changes. IndexedDB version/schema, transaction guarantees, filenames, Blobs, IDs and backup formats unchanged.
- npm test -- src/workspace src/lib/archive.test.ts src/i18n: PASS, exit 0, 88/88 in 8 files. Prior full suite after these edits: 359/359.
- npx playwright test tests/i18n.spec.ts --project=chromium: PASS, exit 0, 11/11. Includes cross-language bulk move, reload, literal hostile names, menu focus, backup restore, non-destructive collection deletion, JSON handoff, all four languages, both themes, widths 320/375/768/1440 and axe. Test race fixed by waiting for the collection-save dialog to close before reading its ID.
- npx playwright test tests/v41.spec.ts --project=webkit: PASS, exit 0, 13/13, including legacy backups, empty collections, persistence and file-tool regression workflows.
- npm run lint, npm run typecheck, npm run format:check, git diff --check: PASS, exit 0 each. No CSS changes or new dependencies. Root production builds succeeded via Playwright webServer; Pages/full regression remains Phase 6.
- Files: four locale resources; messages.ts/messages.test.ts/useMessageState.ts; WorkspacePage, WorkspaceCollections, WorkspaceActions, FileControls, StorageMeter, ClearWorkspaceButton, ProcessingStatus, JsonFileInput, workspaceStore, workspaceUtils, db, collections; OverflowMenu; tests/i18n.spec.ts; this ledger. FileThumbnail inspected and unchanged.
- Next: 3A — shared/text/developer tool controls and application-owned validation messages. Archive worker diagnostics remain owned by 3C; unknown parser diagnostics stay verbatim. No commit/push/PR.

### 3A progress — 2026-10-03

- New toolMessages tests reproduced missing translated errors, and i18n-tools browser test reproduced untranslated JSON controls before implementation. All 23 text/developer tool components now use four local catalogs; shared TransformTool localized. Tool inputs, generated values, samples, native parser details and technical identifiers stay unchanged.
- Ruling: extend message descriptors with nested parameters for translated cron field/day names and nested JWT diagnostics, while retaining canonical English Error.message and causes. Workers send plain descriptors; no runtime i18n import. runWorkerJob accepts old string errors as well. Cost if wrong: human messages could render incorrectly; focused interpolation and worker cleanup tests cover the boundary.
- Ruling: localize only the validation-error constructor in lorem.ts; its generated Latin output and randomization are unchanged. processing.ts inspected, stage display was already localized in 2C; caseConverter.ts outputs unchanged.
- Focused unit suite initially RED (3 errors missing descriptors), now PASS 124/124. Typecheck PASS. Browser gate running; final static checks and added structured-worker coverage pending. No 3B started. Quota is low (15% remaining); finish/verify 3A and save exact next step before stopping.

### 3A COMPLETE — 2026-10-03

- Quota reset and latest user request authorize continuous completion. All 23 tool controls and application-owned diagnostics translated; four catalogs updated. No algorithms, stored data, user content, routes or IDs changed. Nested descriptors preserve canonical English messages; code/regex worker errors retain descriptors without locale runtime imports. Markdown sanitization and visible task labels unchanged.
- Focused unit command: PASS 125/125 (5 files). Full npm test: PASS 363/363 (25 files). Chromium i18n-tools + i18n: PASS 16/16. WebKit i18n-tools: PASS 5/5. lint, typecheck, format:check, git diff --check: PASS, exit 0 each. Both browser project allowlists include i18n-tools.spec.ts.
- Corrected test-only assumptions: select accessed by computed accessible role/name; clipboard tab foregrounded and Chromium permissions granted; clipboard line endings normalized for Windows; legacy Workspace handoff now expects Spanish JSON input label. No product workaround. No new CSS or dependencies. One-off .i18n-3a-*.cjs helpers inspected and removed.
- 3B started: image/PDF/crop components and processing boundaries inspected. New tests fail as expected on untranslated dimension errors. Next: translate these four UI components and their owned errors/progress; preserve worker, canvas, Blob and object URL behavior.

### 3B COMPLETE — 2026-10-03

- Image/PDF controls, errors, progress and ephemeral result details localized. Files: four tool UI components, four locale catalogs, messages/useMessageState, imageFiles/pdfFiles/pdfPages/crop, PDF worker/client/renderer, FileControls/workspaceTypes, toolMessages/i18n-tools/PDF client/renderer tests. No dependencies or CSS changes.
- Ruling: FileOutput.detail accepts a display descriptor as well as string; it is ephemeral UI information and is not persisted to IndexedDB or backup files. This lets completed results change language without regenerating files. English fallback remains identical; renderer tests now assert that fallback and descriptor identity. Cost if wrong: result captions could be incorrect, covered by unit and cross-language browser tests.
- New unit and browser tests RED on untranslated dimensions/image controls, then GREEN. Focused unit command PASS 102/102 (6 files). Chromium focused files/object/PDF/crop command PASS 4/4; additional files rerun PASS 2/2; final in-flight encoding test after lint correction PASS 1/1. Five distinct browser cases cover all 11 image/PDF tools, dimensions, input/output URL identity, ongoing jobs, PDF batch rendering, cleanup, Workspace preview persistence and axe. Existing white PNG/JPEG renderer lifecycle tests pass.
- lint, typecheck, format:check and git diff --check PASS. Root build passes through Playwright webServer. Broader four-language/theme matrix and Pages remain Phases 5–6. One-off 3B editing helper removed. Next: 3C archive/inspection/package diagnostics, preserving machine-readable exports.
