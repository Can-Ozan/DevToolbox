# Object URL lifecycle audit — v3.2

## Creation sites

There are two production `URL.createObjectURL` call sites. Tests wrap or spy on the real APIs; they do not introduce application URL owners.

| Creation site                                      | Owner                                    | Revocation                                                                                                                                                                                                                                |
| -------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/workspace/FileControls.tsx` — `useObjectURL`  | One mounted preview and its current Blob | The same effect returns `URL.revokeObjectURL(url)`. React runs this before replacing the Blob, when clearing it, and on unmount. The hook returns no old URL when the Blob changes, so the old image source is removed before revocation. |
| `src/workspace/workspaceUtils.ts` — `downloadFile` | One download attempt                     | `finally` schedules revocation after 1 second, including DOM/click errors. The timer deliberately survives tool navigation so the browser can start the download and the URL is still cleaned up.                                         |

`DownloadButton` in `src/components/ui.tsx` now delegates to `downloadFile`; its duplicate URL creation was removed.

## Preview owners and cleanup paths

- **Image tools and Image Cropper:** source previews use `useObjectURL`. Replacement and invalid input remove the previous source; navigation unmounts it. Cancelling processing retains a source URL only while that source image is still displayed.
- **FileOutputPanel:** owns one image result preview. Starting another job, changing output settings, clearing/cancelling the job, replacing input, or navigating away removes the old output and revokes its URL. Successful results retain their URLs while visible.
- **PDF → Images batches:** every output card owns its own image URL through FileOutputPanel. No preview URL is created until the complete batch succeeds. Reset/replacement and unmount clean up all cards. Failed/cancelled partial batches remain Blobs in the job only and are discarded without creating URLs.
- **Workspace Preview:** its keyed preview component unmounts when the dialog closes, the file changes, or the page unmounts. Asynchronous validation is guarded against publishing after cleanup.
- **Workspace thumbnails:** visible cards own their generated thumbnail Blobs and URLs. Leaving the viewport clears the thumbnail; grid/list changes and page navigation unmount it. The IntersectionObserver disconnects and the thumbnail AbortController aborts on cleanup.

Persistent Workspace content is stored as **Blobs in IndexedDB**, not object URL strings. Revoking any thumbnail/preview/download URL does not remove or invalidate a saved file. Reopening a saved file creates a new temporary URL as needed.

## PDF rendering and other processing resources

`src/tools/pdf-to-images/pdfRenderer.ts` passes a `Uint8Array` directly to PDF.js. It creates **no temporary PDF object URL**. Its worker URL is a same-origin Vite asset, including under `/DevToolbox/`.

- Success/error/cancellation/timeout all reach `finally`: clear the 30-second timer, remove the abort listener, and destroy the PDF loading task/worker.
- Cancellation immediately cancels an active render and destroys the loading task. Component cleanup aborts the shared file job.
- Each allocated page canvas is zeroed and `page.cleanup()` runs in `finally`, including render/encoding failures.
- The inter-page zero-delay yield is awaited; it is not a recurring timer.
- PDF.js includes a cross-origin worker-wrapper object URL path and a rich-media annotation URL path in its dependency code. Neither is used: the worker is same-origin and the app renders canvas pages without an annotation/media layer. The media path also has its own destroy-time revocation. No dependency patches were needed.
- Existing PDF editing workers terminate and remove their abort listener/timeout on success, error, cancellation, and timeout.
- Image decoding/processing closes ImageBitmaps in cleanup and clears processing canvases; it does not create decoding object URLs. Native bitmap decode/canvas encoding cannot be forcibly interrupted, but aborted results are discarded and resources released when the browser operation settles.
- Regex workers already stopped on success/error/timeout/unmount. The synchronous `postMessage` failure path now also terminates the worker and clears its timeout immediately.

## PWA and downloads

The service worker caches the app shell and explicitly matched same-origin HTTP(S) static assets. Runtime rules exclude query strings and non-HTTP(S) protocols, including `blob:`. Generated PDF/image outputs and Workspace contents have no matching cache route. PWA listeners belong to the application document, not individual processing jobs; transient worker state listeners remove themselves when activated/redundant.

The 1-second download cleanup is intentionally separate from preview ownership. Preview URLs remain valid for their displayed images even after a separately created download URL is revoked.

## Tests and findings

- `src/workspace/download.test.ts`: successful and throwing download clicks; no premature revocation; eventual revocation and zero remaining timers.
- `src/tools/pdf-to-images/pdfRenderer.test.ts`: success, render error, encoding error, cancellation, and timeout; loading-task destruction, canvas/page cleanup, abort-listener removal, zero timers, and no PDF object URL creation.
- `tests/object-urls.spec.ts`: real create/revoke spies over repeated crop replacements/downloads, invalid input, PDF batches, active-worker cancellation, active-job unmount, Workspace preview closure, lazy thumbnails, and SPA navigation. Checks live URL/worker counts and premature image failures; confirms saved Workspace Blobs survive preview cleanup.
- Existing PDF worker tests cover timeout, cancellation, worker errors, and successful stage/result handling. PWA browser tests inspect cache contents and offline Workspace persistence.

**Fixed:** download URLs could leak if DOM setup or `anchor.click()` threw before the cleanup timer was scheduled. Both download paths now share a `try/finally` helper. A Regex worker could linger until its timeout after a synchronous send failure; it now terminates immediately.

**Not found:** orphan preview or PDF URLs in the exercised replacement/clear/error/cancel/unmount paths. Testing uses Chromium plus mocked unit resource checks; this is not a guarantee against every browser/renderer defect.
