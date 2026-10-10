import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { withContentSecurityPolicy } from './vite-plugin-csp.ts'

const hash = (source: string) => `'sha256-${createHash('sha256').update(source).digest('base64')}'`

const page = (head: string) =>
  [
    '<!doctype html>',
    '<html>',
    '  <head>',
    '    <meta charset="UTF-8" />',
    `    ${head}`,
    '  </head>',
    '</html>',
  ].join('\n')

describe('withContentSecurityPolicy', () => {
  it('adds the policy right after the character set', () => {
    const html = withContentSecurityPolicy(page(''), ['https://transport.opendata.ch'])

    expect(html).toMatch(
      /<meta charset="UTF-8" \/>\n {4}<meta http-equiv="Content-Security-Policy" content="[^"]+" \/>/,
    )
    expect(html).toContain("connect-src 'self' https://transport.opendata.ch;")
  })

  it('allows inline scripts by their hash, however the tag is written', () => {
    const html = withContentSecurityPolicy(
      page('<script>one()</script><SCRIPT>two()</SCRIPT><script type="module">three()</script >'),
      [],
    )

    expect(html).toContain(
      `script-src 'self' ${hash('one()')} ${hash('two()')} ${hash('three()')};`,
    )
  })

  it('leaves scripts with a source to the own origin', () => {
    const html = withContentSecurityPolicy(
      page('<script type="module" src="/assets/index.js"></script>'),
      [],
    )

    expect(html).toContain("script-src 'self';")
  })
})
