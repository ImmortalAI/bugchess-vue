import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv, PluginOption, ServerOptions } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [vue(), tailwindcss()];

  if (mode === 'development') {
    plugins.push(vueDevTools());
  }

  const env = loadEnv(mode, process.cwd());

  const server: ServerOptions | undefined = env.VITE_API_PROXY_URL
    ? {
        proxy: {
          '/api': {
            target: env.VITE_API_PROXY_URL,
            changeOrigin: true,
          },
        },
      }
    : undefined;

  return {
    plugins: plugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: server,
  };
});
