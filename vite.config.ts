import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const cdsToolbarSvgShims: Record<string, string> = {
  'tt-logo.svg': 'tt-logo.ts',
  'ck-logo.svg': 'ck-logo.ts',
  'intuit-ai-logo-light.svg': 'intuit-ai-logo-light.ts',
}

/** CDS Toolbar imports SVGs as Next modules (`logo.src`); redirect to Vite shims. */
function cdsToolbarSvgShimPlugin() {
  return {
    name: 'cds-toolbar-svg-shim',
    enforce: 'pre' as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer?.includes('cds-react-components')) return null
      const file = source.split('/').pop()
      const shim = file && cdsToolbarSvgShims[file]
      if (!shim) return null
      return path.resolve(rootDir, 'src/cds-asset-shims', shim)
    },
  }
}

function gitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

/** Stamp built HTML with commit SHA + no-cache hints for GHE Pages. */
function buildStampPlugin(buildSha: string) {
  return {
    name: 'build-stamp',
    transformIndexHtml(html: string) {
      return html
        .replace(
          '<title>TurboTax Prototyping</title>',
          `<title>TurboTax Prototyping · ${buildSha}</title>`,
        )
        .replace(
          '<meta name="viewport"',
          `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta name="build" content="${buildSha}" />
    <meta name="viewport"`,
        )
    },
  }
}

const buildSha = gitShortSha()

// Relative base so the built prototype works when served from any path —
// specifically `/workspace/prototypes/<name>/dist/` via the cgpm dashboard
// server on port 8080. Do not change to absolute paths; the dashboard
// serves many prototypes under different folders.
export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
  },
  plugins: [
    cdsToolbarSvgShimPlugin(),
    buildStampPlugin(buildSha),
    tailwindcss(),
    react({
      include: [/\.(jsx|js|tsx|ts)$/, /node_modules\/cds-react-components/],
    }),
  ],
  optimizeDeps: {
    include: ['cds-react-components', '@genux-ds/animated-brand'],
  },
  base: './',
  server: {
    port: 5174,
    strictPort: true,
    open: '/#/diwm-journey/mweb',
  },
})
