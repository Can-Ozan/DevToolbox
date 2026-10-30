# Internationalization coverage

The application ships four locale bundles: English (`en`), Turkish (`tr`), German
(`de`) and Spanish (`es`). English is the typed fallback resource. The
`src/i18n/resources.test.ts` suite checks key parity, non-empty values,
interpolation token parity and plural variants for every shipped bundle.

## Registry coverage

All 37 registry tool IDs use localized names, descriptions and search metadata.
IDs and routes remain stable and are never translated:

`xml`, `code-formatter`, `zip`, `json`, `base64`, `uuid`, `jwt`, `regex`,
`password`, `url`, `timestamp`, `hash`, `color`, `lorem`, `diff`, `json-yaml`,
`markdown`, `cron`, `qr`, `case`, `number-base`, `contrast`, `url-parser`,
`image-converter`, `image-compressor`, `image-resizer`, `image-rotate`,
`image-metadata`, `pdf-merger`, `pdf-splitter`, `pdf-reorder`, `images-to-pdf`,
`pdf-to-images`, `image-cropper`, `json-csv`, `package-json`, `file-inspector`.

## Deliberate non-translated values

The following remain canonical or user-provided by design:

- tool IDs, route paths, URLs, MIME types, file names and collection names;
- package names, versions, script commands and JSON export keys;
- code, JSON, YAML, Markdown, tokens, hashes and generated output;
- parser and third-party diagnostics that are not application-owned copy;
- canonical SEO metadata and service-worker protocol message types.

The browser suites cover language switching, `html[lang]`, Workspace content,
tool metadata and the local-first/offline boundaries. Accessibility and
responsive checks remain part of the Playwright matrix and must be rerun when
browser engines are available.
