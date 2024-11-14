import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import dotenv from 'dotenv'

// dotenv.config()

// https://vitejs.dev/config/

export default defineConfig(({mode}) => {
  // const isDebug = process.env.VITE_DEBUG === 'true';

  return {
      //define: {
      //  __DEBUG__: isDebug,
      //},
      plugins: [
        vue(),
      ],
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('./src', import.meta.url))
        }
      },
      build: {
        rollupOptions: {
          output: {
            entryFileNames: 'assets/app.js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: ({ name }) => {
              if (name.endsWith('.css')) {
                return 'assets/app.css'
              }
              return 'assets/[name]-[hash][extname]'
            }
          }
        }
      }
  }
})
