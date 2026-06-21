import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 从 root package.json 读取版本号，通过 define 注入为全局常量 __APP_VERSION__
const rootPkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
  },
  build: {
    chunkSizeWarningLimit: 1024,
    rolldownOptions: {
      output: {
        // 按内容归类 chunk，减少主包体积
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia')) return 'vendor-vue'
            return 'vendor'
          }
          if (id.includes('game-core/src/portal') || id.includes('game-core/src/spire') || id.includes('game-core/src/mech')) return 'game-portal'
          if (id.includes('game-core/src/edenic') || id.includes('game-core/src/syndicate')) return 'game-edenic'
          if (id.includes('game-core/src/truepath') || id.includes('game-core/src/womling')) return 'game-truepath'
          if (id.includes('game-core/src/magic')) return 'game-magic'
          if (id.includes('game-core/src/races') || id.includes('game-core/src/trait-') || id.includes('game-core/src/achievements')) return 'game-data'
          return undefined
        },
      },
    },
  },
})
