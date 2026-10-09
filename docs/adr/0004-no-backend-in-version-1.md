# 4. No backend in version 1

- Status: accepted
- Date: 2026-10-09

## Context

The timetable source offers a public REST API that allows cross-origin requests. A backend would enable GraphQL, shared caching, synchronisation between devices and push notifications. It would also add hosting, operations and a second point of failure, without making the timetable data any fresher.

## Decision

Version 1 runs entirely in the browser and calls the timetable API through the timetable port. Settings move between devices with a share link or a QR code. The link carries the data in its fragment, which browsers do not send to a server.

## Consequences

- Static hosting is sufficient, see [ADR 6](0006-github-pages-with-previews.md).
- Version 1 has no push reminders and no automatic synchronisation.
- A backend can be added in version 2 as another adapter, without changes to the domain or the UI.
