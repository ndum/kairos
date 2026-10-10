import { createHash } from 'node:crypto'

import type { Plugin } from 'vite'

// Script elements in any spelling of the tag. Scripts with a source are covered by 'self'.
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script[^>]*>/gi
const SOURCE = /\bsrc\s*=/i

/**
 * Adds a Content Security Policy to the built page. GitHub Pages cannot send headers, so the
 * policy comes as a meta tag, with the hashes of the inline scripts the page needs.
 */
export function contentSecurityPolicy(connect: readonly string[]): Plugin {
  return {
    name: 'kairos:content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => withContentSecurityPolicy(html, connect),
    },
  }
}

/** Returns the page with the policy, allowing connections to the given origins. */
export function withContentSecurityPolicy(html: string, connect: readonly string[]): string {
  const hashes = [...html.matchAll(SCRIPT)]
    .filter(([, attributes = '']) => !SOURCE.test(attributes))
    .map(([, , source = '']) => `'sha256-${createHash('sha256').update(source).digest('base64')}'`)
  const policy = [
    "default-src 'self'",
    ['script-src', "'self'", ...hashes].join(' '),
    // Vue sets styles that change at runtime through the CSSOM, which the policy allows.
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    ['connect-src', "'self'", ...connect].join(' '),
    "manifest-src 'self'",
    "worker-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
  // Right after the character set, so the policy applies to everything that follows.
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`
  return html.replace(/<meta charset="[^"]*" \/>/, (charset) => `${charset}\n    ${meta}`)
}
