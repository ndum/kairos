# 7. Read timetables from transport.opendata.ch behind a port

- Status: accepted
- Date: 2026-10-09

## Context

Kairos needs journeys with transfers and real-time data for Swiss public transport. Three sources were considered in October 2026:

- **transport.opendata.ch**, the Transport API of Opendata.ch: JSON, no key, cross-origin requests allowed, real-time data. Since 5 October 2026 it answers from its own copy of the official GTFS and GTFS-RT data. It is run by an association without a service level.
- **opentransportdata.swiss**, the official platform: OJP 2.0 with XML and a personal API key, which would be visible in a client-side app.
- **timetable.search.ch**: JSON without a key, limited to 1000 journey searches per day and to personal use.

## Decision

- The application talks to a `TimetablePort`. The first adapter, `TransportOpendataTimetable`, uses transport.opendata.ch.
- Requests ask for the needed fields only, which shrinks a response to about a quarter.
- Requests time out after eight seconds. Responses are validated with Valibot before they are mapped to the domain model.
- A scheduled contract test calls the real API every night.
- The app shows the required credit "Timetable data: opentransportdata.swiss".

## Consequences

- The API does not report cancellations. Cancelled trips are missing from its results, so the domain flag `cancelled` stays false for this adapter.
- search.ch can be added as a fallback adapter later without changes outside the infrastructure layer.
