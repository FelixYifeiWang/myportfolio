import { defineConfig } from 'astro/config';

export default defineConfig({
  trailingSlash: 'never',
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
