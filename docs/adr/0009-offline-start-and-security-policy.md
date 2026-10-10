# 9. Start offline with a service worker and lock down the page with a policy

- Status: accepted
- Date: 2026-10-10

## Context

Commuters open Kairos on the way, sometimes in a tunnel or with a weak signal. The app has to start without a connection and show what it knew last. On the iPhone it runs from the Home Screen, where a service worker is the only way to start offline.

GitHub Pages cannot send HTTP headers, so a Content Security Policy can only come with the page itself.

## Decision

- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) generates a Workbox service worker that stores the app at install time: scripts, styles, icons, the manifest and the Latin subsets of the font. Navigations fall back to the stored page, except below `pr-preview/`, where previews bring their own worker.
- Timetable data does not go through the service worker. The app keeps its own cache with the time of each refresh, see [ADR 8](0008-adaptive-polling.md), and knows how fresh its data is. The board says "Offline" as soon as the device loses its connection and catches up when it is back.
- A new version is offered with a message and only applied when the user taps it, so a countdown never disappears while someone looks at it. The app looks for a new version every hour.
- A build step adds a Content Security Policy as a meta tag right after the character set. Scripts may only come from the app itself and the hashed inline script that applies the theme before the first paint. Styles come from the app's files only; Vue changes styles at runtime through the CSSOM, which the policy allows. Connections are limited to the app and the Transport API.
- The end-to-end tests fail on any violation of the policy.

## Consequences

- The app starts without a connection, on the iPhone and on the desktop.
- A policy in a meta tag cannot use `frame-ancestors` or reporting. Hosting with headers would allow both.
- Adding a third-party service, for example a second timetable source, requires an entry in `connect-src`.
- Inline style attributes are blocked. Components set changing styles through bindings, never through `setAttribute('style', …)`.
