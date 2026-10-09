# Contributing to Kairos

Thank you for taking the time to contribute. This guide explains how the project is set up and what a pull request needs before it can be merged.

## Development setup

Requirements: Node.js 24.11 or later (26 recommended) and npm 11.

```bash
git clone https://github.com/ndum/kairos.git
cd kairos
npm ci
npx playwright install chromium webkit
npm run dev
```

`npm ci` also installs the Git hooks. They format-check and lint staged files and validate commit messages.

## Workflow

1. Open an issue first for larger changes, so the approach can be agreed on.
2. Create a branch from `main` named after the type of change, for example `feat/route-sharing` or `fix/leave-time-rounding`.
3. Commit in small, self-contained steps.
4. Open a pull request and fill in the template. Every pull request gets a preview deployment for testing on a phone.
5. Pull requests are merged with squash merge once all checks pass.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint. Use the imperative mood and English:

```text
feat(routes): share a route as a QR code
fix(countdown): keep the reserve when a train is delayed
docs(adr): record the choice of the timetable source
```

The release notes are generated from these messages.

## Architecture

The code follows a hexagonal architecture with four layers, described in [ADR 3](docs/adr/0003-hexagonal-architecture.md):

- `src/domain` contains plain TypeScript without framework imports.
- `src/application` holds use cases and the ports to the outside world.
- `src/infrastructure` implements the ports.
- `src/ui` contains the Vue components and views.

ESLint fails when an import crosses a layer in the wrong direction. Decisions that change this structure need a new [architecture decision record](docs/adr/README.md).

## Tests

- Domain and application code is written test-first. Unit tests live next to the code as `*.test.ts`.
- Component tests run in real browsers (Chromium and WebKit) and are named `*.browser.test.ts`.
- End-to-end tests in `e2e/` cover the main user journeys on an iPhone profile and desktop Chrome.
- Tests that touch the timetable API use recorded responses. Only the scheduled contract test calls the real API.

Run everything locally before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run test:browser
npm run test:e2e
```

## Code style

- Code, comments, file names and commit messages are in English. Text shown in the app is translated in the locale files.
- Prettier formats the code and ESLint checks it. Do not disable rules without a comment that explains why.
- Comments explain why something is done, not what the code does.
- Text in the app does not use the middle dot (·) as a separator. Use separate elements, line breaks or commas instead.

## Reporting bugs

Use the bug report template and include the device, the browser and the steps that lead to the problem. Please report security issues privately to the maintainer and not in a public issue.
