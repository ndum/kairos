/** Crockford's Base32 alphabet, which leaves out letters that are easily confused. */
const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'

/** A random id with 60 bits of entropy, short enough to keep share links compact. */
export function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  // 256 is a multiple of 32, so every character is equally likely.
  return Array.from(bytes, (byte) => ALPHABET.charAt(byte % ALPHABET.length)).join('')
}
