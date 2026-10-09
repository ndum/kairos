# 6. Host on GitHub Pages with pull request previews

- Status: accepted
- Date: 2026-10-09

## Context

The app is a static build. It has to be reachable over HTTPS on an iPhone, and changes should be testable on a phone before they are merged.

## Decision

- Every push to `main` builds the app with the base path `/kairos/` and publishes it to the `gh-pages` branch.
- Every pull request is built with its own base path and published to `pr-preview/pr-<number>/` on the same branch. The preview is removed when the pull request is closed.
- The build output consists of plain static files, so the app can be served from any other web server as well.

## Consequences

- GitHub Pages does not allow custom HTTP headers. Security policies are set with `<meta>` tags where the browser supports it.
- The service worker of the production app must not handle requests below `pr-preview/`.
