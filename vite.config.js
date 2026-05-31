import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { siteContentPlugin } from './scripts/site-content-plugin.js';

export default defineConfig({
  base: '/',
  plugins: [
    siteContentPlugin(__dirname)
  ],
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        blog: resolve(__dirname, 'blog.html'),
        blogPost: resolve(__dirname, 'blog-read.html'),
        reading: resolve(__dirname, 'reading.html'),
        readingPost: resolve(__dirname, 'reading-read.html')
      }
    }
  }
});
