# 5. Frontend stack

- Status: accepted
- Date: 2026-10-09

## Context

The app has to start fast on a phone, stay maintainable for a single developer and follow current practice. The choice was made in October 2026.

## Decision

- **Vue 3.5** with `<script setup>` and the Composition API. Vue 3.6 and its Vapor mode are still release candidates.
- **TypeScript 6** in strict mode. TypeScript 7 is stable, but vue-tsc and typescript-eslint still rely on the compiler API of TypeScript 6. Dependabot ignores major TypeScript updates until this changes.
- **Vite 8** for development and production builds.
- **Tailwind CSS 4** with the design tokens defined as CSS custom properties.
- **Vitest 5** for unit tests and for component tests in real browsers (Chromium and WebKit), **Playwright** for end-to-end tests.
- **ESLint 10** with typescript-eslint and eslint-plugin-vue, **Prettier** for formatting. Biome and Oxlint do not yet check Vue templates completely.
- **npm** as package manager, because it ships with Node.js and needs no global installation.
- Further libraries such as Vue Router, Pinia, VueUse and vue-i18n are added with the feature that first needs them.

## Consequences

- The JavaScript needed for the first render must stay below 100 KB (gzip). CI checks this budget on every pull request.
- Component tests run in WebKit as well, which covers the engine of Safari on iOS.
