import { defineConfig } from 'astro/config';

export default defineConfig({
  devToolbar: { enabled: false },
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
