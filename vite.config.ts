import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  worker: { format: 'es' },
  plugins: [
    react(),
    tailwindcss(),
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
        description: '35 local-first tools for code, files, images and PDFs.',
        start_url: base,
        scope: base,
        display: 'standalone',
        theme_color: '#7560df',
        background_color: '#17171c',
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
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/\/assets\//, /\/pdf-assets\//, /\.[a-z0-9]+$/i],
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['**/pdfRenderer-*.js', 'pdf-assets/**', '**/{standalone,babel,estree,html,postcss}-*.js'],
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
