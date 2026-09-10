// A 5x7 bitmap font, rendered into voxels and embossed on the plate below the code.
// Rows read top to bottom; '#' is a raised cell. Anything not in the table becomes
// a space, and lowercase is folded to uppercase.

const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
}

export const GLYPH_W = 5
export const GLYPH_H = 7
export const MAX_NAME = 24
const GAP = 1
const SPACE_W = 3
const LEADING = 2 // blank rows between wrapped lines

const wordWidth = (word) => word.length * GLYPH_W + Math.max(0, word.length - 1) * GAP

/**
 * Rasterise a label to a boolean grid, wrapping to stay inside maxWidth modules.
 *
 * Without wrapping a 24-character name is 144 modules wide and dwarfs a small
 * code — the plate has to widen to hold it, and the QR ends up a stamp in the
 * corner. Wrapping keeps the plate close to the proportions of the code.
 *
 * Returns null for an empty label, otherwise { w, h, bits } with bits[row][col].
 */
export function renderLabel(text, maxWidth = Infinity) {
  const clean = String(text || '').toUpperCase().slice(0, MAX_NAME).trim()
  if (!clean) return null

  // greedy wrap on spaces; hard-break any single word that cannot fit
  const limit = Math.max(GLYPH_W, maxWidth)
  const lines = []
  let current = ''
  const flush = () => { if (current) { lines.push(current); current = '' } }
  for (const word of clean.split(/\s+/)) {
    if (!word) continue
    let w = word
    while (wordWidth(w) > limit) {
      const fit = Math.max(1, Math.floor((limit + GAP) / (GLYPH_W + GAP)))
      flush()
      lines.push(w.slice(0, fit))
      w = w.slice(fit)
    }
    if (!w) continue
    const candidate = current ? `${current} ${w}` : w
    if (current && lineWidth(candidate) > limit) {
      flush()
      current = w
    } else {
      current = candidate
    }
  }
  flush()
  if (!lines.length) return null

  const w = Math.max(...lines.map(lineWidth))
  const h = lines.length * GLYPH_H + (lines.length - 1) * LEADING
  const bits = Array.from({ length: h }, () => new Array(w).fill(false))

  lines.forEach((line, li) => {
    const y0 = li * (GLYPH_H + LEADING)
    let x = Math.floor((w - lineWidth(line)) / 2) // centre each line
    for (let i = 0; i < line.length; i++) {
      const g = line[i] === ' ' ? null : G[line[i]]
      if (g) {
        for (let r = 0; r < GLYPH_H; r++) {
          for (let c = 0; c < GLYPH_W; c++) if (g[r][c] === '#') bits[y0 + r][x + c] = true
        }
        x += GLYPH_W
      } else {
        x += SPACE_W
      }
      if (i < line.length - 1) x += GAP
    }
  })

  return { w, h, bits, lines }
}

function lineWidth(line) {
  let w = 0
  for (let i = 0; i < line.length; i++) {
    w += line[i] === ' ' ? SPACE_W : GLYPH_W
    if (i < line.length - 1) w += GAP
  }
  return w
}
