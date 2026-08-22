import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://zheyesong.github.io',
  output: 'static',
  trailingSlash: 'always',
  vite: {
    build: {
      chunkSizeWarningLimit: 600,
    },
  },
  integrations: [
    sitemap({
      namespaces: {
        news: false,
        video: false,
        xhtml: false,
      },
    }),
  ],
});
