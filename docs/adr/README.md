# Architecture decision records

This folder records the significant decisions behind Kairos, one file per decision. Accepted records are not rewritten. A later record supersedes an earlier one and links back to it.

| No.                                            | Decision                                                 | Status   |
| ---------------------------------------------- | -------------------------------------------------------- | -------- |
| [1](0001-record-architecture-decisions.md)     | Record architecture decisions                            | Accepted |
| [2](0002-progressive-web-app.md)               | Build a progressive web app                              | Accepted |
| [3](0003-hexagonal-architecture.md)            | Use a hexagonal architecture                             | Accepted |
| [4](0004-no-backend-in-version-1.md)           | No backend in version 1                                  | Accepted |
| [5](0005-frontend-stack.md)                    | Frontend stack                                           | Accepted |
| [6](0006-github-pages-with-previews.md)        | Host on GitHub Pages with pull request previews          | Accepted |
| [7](0007-timetable-source.md)                  | Read timetables from transport.opendata.ch behind a port | Accepted |
| [8](0008-adaptive-polling.md)                  | Refresh with adaptive polling                            | Accepted |
| [9](0009-offline-start-and-security-policy.md) | Start offline and lock down the page with a policy       | Accepted |

## Template

```markdown
# N. Title in imperative form

- Status: proposed | accepted | superseded by ADR N
- Date: YYYY-MM-DD

## Context

What forces are at play and why a decision is needed.

## Decision

What was decided.

## Consequences

What becomes easier or harder because of it.
```
