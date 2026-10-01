import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { getReleaseByVersion } from './src/data/releases.ts'
import packageInfo from './package.json' with { type: 'json' }

const base = process.env.VITE_BASE_PATH || '/'
const { version } = packageInfo
const release = getReleaseByVersion(version)
if (!release)
  throw new Error(`Add bundled release notes for DevToolbox ${version} before building.`)
const releaseScript = `self.addEventListener('message', (event) => {
  if (event.data?.type === 'DEVTOOLBOX_RELEASE_NOTES') {
    event.ports[0]?.postMessage(${JSON.stringify(release)});
  }
});`
const releaseFilename = `release-notes-${createHash('sha256').update(releaseScript).digest('hex').slice(0, 12)}.js`

export default defineConfig({
  base,
  worker: { format: 'es' },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'bundled-worker-release-notes',
      apply: 'build',
      buildStart() {
        // Immutable script URLs prevent the active and waiting workers sharing stale notes.
        this.emitFile({ type: 'asset', fileName: releaseFilename, source: releaseScript })
      },
    },
    {
      name: 'local-pdf-renderer-assets',
      apply: 'build',
      buildStart() {
        // PDF.js fonts/decoders are bundled locally, but cached only when requested.
        for (const folder of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
          const directory = resolve('node_modules/pdfjs-dist', folder)
          for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (entry.isFile())
              this.emitFile({
                type: 'asset',
                fileName: `pdf-assets/${folder}/${entry.name}`,
                source: readFileSync(resolve(directory, entry.name)),
              })
          }
        }
      },
    },
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        id: base,
        name: 'DevToolbox',
        short_name: 'DevToolbox',
        description: '37 local-first tools for code, files, images, PDFs and developer workflows.',
        start_url: base,
        scope: base,
        display: 'standalone',
        theme_color: '#7355ce',
        background_color: '#111216',
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: `${base}icons/icon-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        importScripts: [`${base}${releaseFilename}`],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/\/assets\//, /\/pdf-assets\//, /\.[a-z0-9]+$/i],
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: [
          '**/pdfRenderer-*.js',
          'pdf-assets/**',
          '**/{standalone,babel,estree,html,postcss}-*.js',
        ],
        // Runtime cache is limited to same-origin, bundled, query-free assets.
        // User data is passed to workers in memory, never through these URLs.
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              ['http:', 'https:'].includes(url.protocol) &&
              !url.search &&
              url.href.startsWith(
                (self as unknown as { registration: ServiceWorkerRegistration }).registration.scope,
              ) &&
              /\/(?:assets|pdf-assets)\/[^?]+\.(?:js|mjs|css|wasm|bcmap|ttf|pfb|icc)$/.test(
                url.pathname,
              ),
            handler: 'CacheFirst',
            options: {
              cacheName: 'devtoolbox-renderer-assets-v1',
              expiration: { maxEntries: 256, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
