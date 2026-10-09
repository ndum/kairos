# 2. Build a progressive web app

- Status: accepted
- Date: 2026-10-09

## Context

Kairos has to run on an iPhone and on desktop computers, up to a 34-inch ultrawide monitor. A native iOS app would offer Home Screen widgets and Live Activities, but it requires a Mac with Xcode, a paid Apple Developer Program membership and a separate solution for the desktop.

## Decision

Kairos is a progressive web app. On iOS it is added to the Home Screen and runs as a standalone web app. On the desktop it runs in any current browser and can be installed there as well.

## Consequences

- One code base serves every device.
- There are no Home Screen widgets, Lock Screen widgets or Live Activities.
- Notifications while the app is closed require Web Push and therefore a server. They are out of scope for version 1, see [ADR 4](0004-no-backend-in-version-1.md).
- Supported browsers are Safari on iOS 27 and 26 and the current versions of Chrome, Edge and Firefox.
