import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const frontendRoot = path.resolve(__dirname, '../..')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontendRoot, '')
  /** Локальный uvicorn: http://127.0.0.1:8000 — тогда /v1 идёт без префикса /api */
  const devApiTarget = env.VITE_DEV_API_PROXY_TARGET?.trim()
  const defaultRemote = 'https://api.delez-repo.ru'
  const v1Target = devApiTarget || defaultRemote
  const authTarget = devApiTarget || defaultRemote
  const v1Rewrite = (p: string) =>
    devApiTarget ? p : p.replace(/^\/v1/, '/api/v1')
  const authRewrite = (p: string) =>
    devApiTarget ? p : p.replace(/^\/auth/, '/api/auth')

  return {
    plugins: [
      react(),
      tailwindcss() as any
    ],
    envDir: frontendRoot,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      watch: {
        usePolling: true,
      },
      hmr: {
        host: 'localhost',
        port: 3000,
      },
      proxy: {
        '/ai': {
          target: defaultRemote,
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: authTarget,
          changeOrigin: true,
          secure: false,
          rewrite: authRewrite,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq) => {
              console.log('Proxying to:', proxyReq.path);
            });
            proxy.on('proxyRes', (proxyRes) => {
              console.log('Response:', proxyRes.statusCode);
            });
          },
        },
        '/v1': {
          target: v1Target,
          changeOrigin: true,
          secure: false,
          rewrite: v1Rewrite,
        }
      }
    }
  }
})


