# 1. Record architecture decisions

- Status: accepted
- Date: 2026-10-09

## Context

Kairos is developed by a single maintainer over several releases. Decisions about structure, technology and trade-offs need to remain understandable later, for the maintainer as well as for contributors.

## Decision

Significant decisions are recorded as architecture decision records in `docs/adr`, one Markdown file per decision, numbered in order. An accepted record is not rewritten. A later record supersedes it and links back.

## Consequences

- The reasoning behind the architecture is versioned together with the code.
- A pull request that changes a recorded decision adds a new record.
