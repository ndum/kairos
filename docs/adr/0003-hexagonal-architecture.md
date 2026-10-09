# 3. Use a hexagonal architecture

- Status: accepted
- Date: 2026-10-09

## Context

The core of Kairos is time arithmetic: when to leave, which connection is still reachable and how much reserve is left. This logic has to be testable without a browser, a network or a framework. The timetable source has to remain replaceable.

## Decision

The code under `src/` is organised in four layers. Dependencies point inwards only.

| Layer            | Responsibility                                                                                  | May depend on           |
| ---------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| `domain`         | Models and rules such as leave times, the traffic light and line preferences. Plain TypeScript. | nothing                 |
| `application`    | Use cases, scheduling and the ports, the interfaces to the outside world.                       | `domain`                |
| `infrastructure` | Adapters that implement the ports: timetable API, storage, clock and location.                  | `application`, `domain` |
| `ui`             | Vue components, views, routing and presentation state.                                          | `application`, `domain` |

`src/main.ts` is the composition root. It creates the adapters and passes them to the application services.

ESLint enforces the rules with `no-restricted-imports`, configured per layer in `eslint.config.ts`.

## Consequences

- Domain and application code is covered by fast unit tests that use a fake clock.
- Replacing transport.opendata.ch, for example with a GraphQL backend in version 2, touches the infrastructure layer only.
- Small features need some indirection. This is accepted in favour of a consistent structure.
