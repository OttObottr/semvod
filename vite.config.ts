import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gzipSync } from 'node:zlib';

export default defineConfig({
  plugins: [react(), {
    name: 'precompress-assets',
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) if (/\.(js|css)$/.test(file.fileName)) {
        this.emitFile({ type: 'asset', fileName: `${file.fileName}.gz`, source: gzipSync(file.type === 'chunk' ? file.code : file.source) });
      }
    },
  }],
  build: { outDir: 'dist/client' },
});
