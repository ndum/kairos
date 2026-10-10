/** The part of a QR code from lean-qr that drawing it needs. */
export interface QrModules {
  readonly size: number
  get(x: number, y: number): boolean
}

/** An SVG path with one rectangle per run of dark modules in a row, one unit per module. */
export function qrPath(code: QrModules): string {
  let path = ''
  for (let y = 0; y < code.size; y++) {
    let x = 0
    while (x < code.size) {
      if (!code.get(x, y)) {
        x++
        continue
      }
      let run = 1
      while (x + run < code.size && code.get(x + run, y)) run++
      path += `M${x} ${y}h${run}v1h-${run}z`
      x += run
    }
  }
  return path
}
