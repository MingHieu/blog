// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://minghieu.github.io',
  base: '/blog',
  markdown: {
    shikiConfig: {
      // Use a high-contrast dark theme for all modes to ensure readability
      theme: 'github-dark',
    },
  },
});
