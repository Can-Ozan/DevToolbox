# DevToolbox multilingual architecture — phase 1

## Intent and constraints

Add English, Turkish, German and Spanish throughout the existing DevToolbox v4.1 interface. English remains the canonical fallback. Preserve the 37 tools, Workspace Collections, current visual system, accessibility, local processing, unsaved inputs, service worker update consent and GitHub Pages deployment at `/DevToolbox/`.

This is localization, not a redesign or a feature expansion. Do not translate user content or change processing algorithms. No accounts, backend, translation services, analytics, telemetry, runtime release lookup or translated routes. Do not invent a release version or new release history. Do not commit or push before the complete audit passes.

The user approved the architecture on 2026-10-01. This document records its implementation boundaries for review before the implementation plan.

## Repository baseline

- Current checkout: `feat/pwa-release-notes-clean`, containing the release notes implementation.
- The pending `.github/workflows/verify.yml` edit raises CI timeout from 20 to 45 minutes. Preserve it. The remote branch already contains the equivalent change in `576bbc2`; reconcile the identical change without resetting or discarding work before creating the feature branch.
- Create `codex/multilingual-foundation` only after the implementation plan is clear. Do not modify `main`.
- Preferences use a validated version-1 localStorage record and `useSyncExternalStore`, with cross-tab storage events and session-only operation when persistence fails.
- Tool IDs, categories, route paths and compatibility metadata are centralized in `src/registry/tools.ts`.
- Native dialogs already own focus trapping, Escape and overlapping scroll locks. Keep that system.
- PWA updates obtain release content from the incoming service worker through `MessageChannel`; activation/reload requires explicit consent in each tab.

## Selected approach and alternatives

Use `i18next` and `react-i18next`, with typed local resources and the existing preferences store. This supplies fallback and plural handling while keeping detection, offline loading and persistence under application control.

A custom React dictionary would save a dependency but would require maintaining pluralization, fallback and type support ourselves. A larger i18next plugin stack would add a language detector and HTTP backend even though the required browser detection is small and all resources ship locally. Neither alternative offers an advantage for this application.

The proposed versions are i18next 26.4.2 and react-i18next 17.0.15, subject to exact installed-lockfile validation. NPMScan reports active maintenance, MIT licenses and no known vulnerabilities across their five-package dependency graph. Recheck actual resolved packages and lifecycle scripts before installation. Do not add a UI library, HTTP translation backend or language-detector dependency.

## Resources and types

Create `src/i18n/` for the language union, English resource schema, non-English resources, initialization, loading and typed access helpers. Group keys by responsibility: common UI, navigation/discovery, Settings, Workspace, PWA/releases, tool metadata and tool controls/messages. Prefer semantic keys and complete sentences with named interpolation parameters. Use locale-aware plural forms rather than concatenating translated fragments.

English resources define the canonical typed key schema through i18next module augmentation. Translation objects must match the intended schema; automated checks verify key coverage, interpolation tokens, required plural forms and non-empty values. An intentionally missing translation must fall back to English rather than display a raw key or empty text.

Use explicit dynamic imports for Turkish, German and Spanish. These become same-origin, content-hashed build chunks. Keep English available for startup and recovery. Do not add a runtime translation API or a request that sends user data.

Measure the initial compressed bundle against the unchanged baseline. Additional languages must not be eagerly imported into that bundle. Translation chunks must be included by the existing Workbox JavaScript precache rules, verified in the built service worker. Thus an installed offline app can switch to a language that was not previously selected online.

## Detection, persistence and lifecycle

Add an optional validated language field to the existing preferences record without changing its storage key or version. Absence means no explicit choice has been saved. Reading old preferences must preserve all existing values.

Resolution order:

1. A valid explicit `en`, `tr`, `de` or `es` preference.
2. The primary browser language from `navigator.languages[0]`, falling back to `navigator.language` when absent. Normalize case and regional subtags: Turkish, German and Spanish variants map to their base language.
3. English for unsupported or malformed browser language values.

Detection does not persist an explicit choice. Changing unrelated preferences must not accidentally pin the detected language. Resetting all preferences clears the explicit choice and returns to browser detection; explain this in the reset copy. Storage denial retains a working in-memory selection with the existing persistence warning. Cross-tab preference changes update the interface safely.

Load the requested locale before committing a language change. Handle overlapping requests so the latest choice wins. Update React text and `document.documentElement.lang` consistently after activation. On loading failure, retain a usable interface and show a localized or English fallback error; never leave a blank screen. Remove subscriptions and listeners through their normal cleanup paths.

Initialize before the application renders to avoid displaying untranslated keys. During later switches, do not reload the page, key the application/provider/tool by language, or suspend/remount the tool subtree. Existing inputs, results, jobs, dialog focus, Workspace selections and tool-use counters must remain intact.

## Selector and visual design

Add a Language section near the top of Settings, before Appearance, using the existing `.settings-section`, `.field` and native `<select>` styles. Options use their own language names: English, Türkçe, Deutsch and Español. Give each option its language attribute where supported. Associate a visible translated label and concise helper text with the select. The current selection is announced by native semantics; provide a polite completion/error message when necessary.

Use the existing control heights, spacing, typography, accent, borders and focus treatment. No flags, custom dropdown runtime, extra modal or topbar redesign. Native keyboard and mobile picker behavior is appropriate for four choices. The same control remains reachable through existing desktop and mobile Settings navigation.

Review wrapping of German text using real content. Apply scoped `min-width: 0`, flexible tracks and wrapping only where localization reveals a genuine layout defect. Never hide page overflow globally or shrink text to disguise overflow.

Better Design's accessibility rules and Lumen's NativeSelect/Dialog contracts support these choices. Themely only exposes theme generation, so it is not suitable for auditing this existing theme. Magic Patterns/MagicPath exploration is unnecessary for the selected native control. Preserve the current tokens instead of adopting generated ones.

## Translation coverage and data boundaries

Translate navigation, breadcrumbs, dashboard, discovery/search, category display labels, Settings, Workspace and Collections controls, common actions, dialogs, warnings, errors, success messages, empty/loading states, processing/result panels, PWA messages, release UI, tool names/descriptions and application-owned controls in all 37 tools.

Use stable registry IDs to resolve translated tool labels. Do not replace the canonical registry or alter route paths, compatibility metadata, lazy component identities, favorites, recent IDs or usage keys. Name sorting should use displayed localized names. Search should match localized names and useful keywords while retaining canonical English names and technical identifiers. Preserve exact-match priority for `json` and the existing `workspace` action behavior.

Do not translate file names, user-created collection names, code/editor values, user Markdown, user JSON/YAML/XML keys, package names, scripts, MIME types, URLs, identifiers, hashes, tokens or machine-readable output keys. Technical examples stay valid. User strings must remain escaped React content, never interpreted as markup or translation keys.

Translate application-owned diagnostics at presentation boundaries. Use stable message identifiers and interpolation values where messages cross asynchronous/store/worker boundaries, retaining canonical English fallback text and existing processing semantics. Do not guess translations from arbitrary exception text or rewrite parsers to localize them. Unknown third-party diagnostics may remain verbatim and must be identified in the final untranslated-string audit.

Human-readable summaries may use the selected language; machine-readable exports keep their existing schema and data. Historical README release notes remain untouched.

## Release notes and PWA behavior

Translate release section headings, dates, Settings entry, update controls and confirmation text. Bundle factual v4.1 release translations without changing the English history.

The incoming worker remains the authority for a pending update's version and content. Never substitute the running tab's v4.1 notes for an unknown incoming version. Localized release content may be an optional validated extension of the existing English release payload; old tabs can ignore it and old workers can return English. Missing or invalid localized content falls back to the validated English payload. Do not require another worker/network lookup when switching languages.

Preserve `SKIP_WAITING`, consent-based reload, Later dismissal, unsaved-work warnings, processing guards, multi-tab safety, MessageChannel cleanup and content-hashed worker release scripts. Keep translations and worker assets within the configured Vite base path. Offline caching remains limited to application assets and does not include user inputs or temporary outputs.

## Routing and SEO

Keep all routes, canonical URL normalization, sitemap paths, robots configuration, manifest start URL and scope unchanged. Do not add language path prefixes, query parameters or duplicate localized routes. Keep the canonical English SEO metadata in phase 1; document language reflects the displayed interface.

Do not let a translated breadcrumb label trigger the existing route-navigation effect's scroll reset or drawer closing. Keep language-driven presentation updates separate from actual navigation side effects where necessary.

## Verification and acceptance

Unit coverage must include regional detection, unsupported browser languages, explicit English overriding another browser language, old/corrupt preferences, blocked localStorage, reset/cross-tab changes, English fallback, missing/empty keys, resource/interpolation parity, switching races, failed chunk recovery and backward-compatible release payloads.

Browser coverage must include all four languages; Settings selector keyboard behavior and document language; input/result preservation; localized Workspace and Collections operations; translated search with English technical shortcuts; PWA update/release labels; incoming-version English fallback; offline switching to a previously unused language; focus/scroll cleanup; no external requests or page errors.

At 320, 375, 768 and 1440px in light and dark themes, assert no horizontal page overflow, reachable controls, usable dialogs and intact editor stacking. Run axe on translated Settings, search, Workspace and release/update UI. Exercise long German labels and dynamic values. Preserve permanent existing regression tests and add targeted new ones.

Run the requested full commands: lint, typecheck, unit tests, format check, `git diff --check`, Chromium, WebKit, Firefox attempt, root production build and `/DevToolbox/` build. Report exact counts and actual failures; Windows `spawn UNKNOWN` before Firefox app execution is an environment limitation. Verify both built deployment paths, translation precaching and the existing PWA runtime smoke flows.

Review the final diff for untranslated application copy, unsafe interpolation, hook/dependency changes, remounts, storage migration, worker lifecycle changes and unrelated edits. Do not claim release readiness until implementation and verification are complete. No commit, push or PR creation during this work.

## Review status

Architecture approved. On 2026-10-01 the user authorized preparation of a phased implementation plan only, and explicitly deferred implementation to conserve quota. See [the implementation plan](../plans/2026-10-01-multilingual-implementation.md) for exact files, tests and resume checkpoints. No feature branch, multilingual product code or dependencies have been added.
