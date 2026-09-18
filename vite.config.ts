import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite no expone las variables de .env en process.env dentro de este archivo: hay que cargarlas.
  const env = loadEnv(mode, process.cwd(), '');

  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
      'next/navigation': path.resolve(__dirname, './src/shims/next-navigation.ts'),
      'next/dynamic': path.resolve(__dirname, './src/shims/next-dynamic.tsx'),
      'next/cache': path.resolve(__dirname, './src/shims/next-cache.ts'),
      'next/image': path.resolve(__dirname, './src/shims/next-image.tsx'),
      'next-auth/react': path.resolve(__dirname, './src/shims/next-auth-react.ts'),
    },
  },
  server: {
    port: 3000,
    allowedHosts: ['fhqtsh2x-300.brs.devtunnels.ms'],
    proxy: {
      '/api': {
        target: env.VITE_FASTAPI_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: env.VITE_FASTAPI_WS_URL,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('@radix-ui')
            ) {
              return 'vendor-ui';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  };
});
