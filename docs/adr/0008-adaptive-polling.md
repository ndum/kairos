# 8. Refresh with adaptive polling

- Status: accepted
- Date: 2026-10-09

## Context

Real-time data changes all the time, but the timetable source only offers request and response. WebSocket or Server-Sent Events would need a server of our own that polls the source in turn, which version 1 does not have (see [ADR 4](0004-no-backend-in-version-1.md)). The source updates its real-time data every 30 seconds and asks clients not to repeat identical requests every few seconds.

## Decision

`TripMonitor` in the application layer keeps the journeys of one connection up to date:

- The interval depends on the next leave time: 30 seconds when the user has to leave within 20 minutes, 2 minutes within 2 hours and 10 minutes otherwise.
- After a failed refresh it backs off from 30 seconds up to 5 minutes and keeps showing the last journeys as stale.
- It pauses while the app is hidden and refreshes as soon as it becomes visible or the network returns.
- On start it shows the cached journeys first and then refreshes them.
- Refreshes are shared between tabs through the cache. A tab skips its request when another tab refreshed recently and takes over journeys that other tabs write.
- The page is never reloaded. Only the data changes, and Vue updates what is affected.

## Consequences

- Close to the leave time the data is at most about 30 seconds old, which matches the source.
- A phone in the pocket causes no requests, because hidden pages do not refresh.
- Push updates can be added later through a backend without changes to the domain or the UI.
