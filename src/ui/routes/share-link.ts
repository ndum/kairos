/** Characters of a share code, which is written in base64url. */
const CODE = /^[\w-]+$/

/**
 * Finds the share code in a link such as https://kairos.ndum.ch/#/import?r=CODE, also in links
 * from earlier addresses of the app. Text without a query is taken as the code itself.
 */
export function shareCodeFrom(text: string): string | null {
  const trimmed = text.trim()
  const query = trimmed.lastIndexOf('?')
  const code = query === -1 ? trimmed : new URLSearchParams(trimmed.slice(query + 1)).get('r')
  return code !== null && CODE.test(code) ? code : null
}
