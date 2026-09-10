// Builds the single printable voxel model the app both renders and exports.
//
// Layout, in integer cells (1 unit = 1 voxel, cubes are full 1.0 so faces meet):
//   y = 0        solid base slab under the entire plate. Also the surface of every
//                light module, and of the photo inset.
//   y = 1..h     dark module caps, h = 1 or 2 for side-on texture.
//   y = 1        the embossed label, in its own band below the code.
//   y >= 1       the avatar, re-seated so its lowest voxel rests on the slab.
//
// Everything is one connected body: the slab grounds the caps and the label, the
// avatar's feet touch the slab, and anything still floating gets a support column.

export const QUIET = 3
export const LIGHT_COLOR = '#f1f5f9'
export const LABEL_GAP = 2 // blank rows between the quiet zone and the label
export const LABEL_MARGIN = 2 // blank rows below the label
/**
 * Edge of the photo inset, in modules.
 *
 * A flat fraction does not work: measured decode limits with ECC H and a
 * full-colour photo are 5/21, 8/25, 10/29, 21/49 and 31/65 modules. Small
 * versions are mostly fixed pattern (finders, timing, format), so they can spare
 * far less of their area. This curve tracks about 75% of the measured limit,
 * leaving margin for print, lighting and cheap scanners.
 */
export function logoModules(n) {
  if (!n) return 0
  const frac = Math.min(0.38, 0.2 + (n - 21) * 0.0045)
  return Math.max(3, Math.round(n * frac))
}

const key = (x, y, z) => `${x},${y},${z}`
const NEIGH = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]

/**
 * Drop support columns until every voxel is connected down to the base slab.
 * Handles the avatar's genuinely floating parts (a golem's crystal core, a deer's
 * antlers) and anything a character definition leaves hanging.
 */
export function buildSupports(cells) {
  const occ = new Map()
  for (const c of cells) occ.set(key(c.x, c.y, c.z), c)
  const supports = []

  // A column can land on another loose component, so repeat until stable.
  for (let pass = 0; pass < 12; pass++) {
    const grounded = new Set()
    const stack = []
    for (const [k, c] of occ) if (c.y === 0) { grounded.add(k); stack.push(c) }
    while (stack.length) {
      const c = stack.pop()
      for (const [dx, dy, dz] of NEIGH) {
        const nk = key(c.x + dx, c.y + dy, c.z + dz)
        if (occ.has(nk) && !grounded.has(nk)) { grounded.add(nk); stack.push(occ.get(nk)) }
      }
    }

    const loose = []
    for (const k of occ.keys()) if (!grounded.has(k)) loose.push(k)
    if (!loose.length) return supports

    const seen = new Set()
    const comps = []
    for (const k of loose) {
      if (seen.has(k)) continue
      const comp = []
      const st = [k]
      seen.add(k)
      while (st.length) {
        const ck = st.pop()
        const cv = occ.get(ck)
        comp.push(cv)
        for (const [dx, dy, dz] of NEIGH) {
          const nk = key(cv.x + dx, cv.y + dy, cv.z + dz)
          if (occ.has(nk) && !grounded.has(nk) && !seen.has(nk)) { seen.add(nk); st.push(nk) }
        }
      }
      comps.push(comp)
    }

    let added = false
    for (const comp of comps) {
      let low = comp[0]
      for (const c of comp) {
        if (c.y < low.y || (c.y === low.y && Math.abs(c.x) + Math.abs(c.z) < Math.abs(low.x) + Math.abs(low.z))) low = c
      }
      for (let y = low.y - 1; y >= 0; y--) {
        const k = key(low.x, y, low.z)
        if (occ.has(k)) break
        const cell = { x: low.x, y, z: low.z, color: low.color, support: true }
        occ.set(k, cell)
        supports.push(cell)
        added = true
      }
    }
    if (!added) break
  }
  return supports
}

/**
 * Structure only — no palette colours. Depends on the code, the character, the
 * label and the photo, so a hue-slider drag never re-runs the support solver.
 *
 * @param label rendered bitmap from renderLabel(), or null
 * @param logo  { size, colors } sampled photo for the centre inset, or null
 */
export function buildStructure(matrix, n, character, { label = null, logo = null } = {}) {
  if (!matrix || !n) {
    return { plate: [], avatar: [], supports: [], n: 0, span: 12, spanX: 12, spanZ: 12, center: { x: 0, z: 0 }, hasLabel: false }
  }

  const off = Math.floor(n / 2)
  const codeLo = -off - QUIET
  const codeHi = n - 1 - off + QUIET

  // Footprint. The label band hangs below the code's quiet zone, and widens the
  // plate if the text is longer than the code — the extra area is all light, so
  // it only ever adds quiet zone.
  let zLo = codeLo
  let zHi = codeHi
  let halfW = Math.max(Math.abs(codeLo), Math.abs(codeHi))
  let labelZ0 = 0
  if (label) {
    labelZ0 = codeHi + LABEL_GAP + 1
    zHi = labelZ0 + label.h - 1 + LABEL_MARGIN
    halfW = Math.max(halfW, Math.ceil(label.w / 2) + 2)
  }
  const xLo = -halfW
  const xHi = halfW
  const labelX0 = label ? -Math.floor(label.w / 2) : 0

  // Photo inset: a flat, image-coloured square at the centre of the code.
  const logoAt = new Map()
  if (logo && logo.size > 0) {
    const m = Math.min(logo.size, n)
    const g0 = Math.floor((n - m) / 2)
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < m; c++) {
        logoAt.set(`${g0 + c},${g0 + r}`, logo.colors[r * m + c] || LIGHT_COLOR)
      }
    }
  }

  const plate = []
  const topAt = new Map() // 'x,z' -> surface level, and what colours it
  for (let z = zLo; z <= zHi; z++) {
    for (let x = xLo; x <= xHi; x++) {
      const gx = x + off
      const gz = z + off
      const inCode = gx >= 0 && gx < n && gz >= 0 && gz < n
      const logoColor = inCode ? logoAt.get(`${gx},${gz}`) : undefined
      const isDark = inCode && !logoColor ? matrix[gz][gx] : false
      const delay = (gx + gz + 24) % 12

      plate.push({ x, y: 0, z, gx, gz, isDark, base: true, delay, logoColor })
      let top = 0
      let fixed = logoColor

      if (isDark) {
        const h = 1 + ((gx * gz) % 2) // checkered pillar height, for side-on texture
        for (let k = 1; k <= h; k++) plate.push({ x, y: k, z, gx, gz, isDark, base: false, delay })
        top = h
      } else if (label) {
        const lr = z - labelZ0
        const lc = x - labelX0
        if (lr >= 0 && lr < label.h && lc >= 0 && lc < label.w && label.bits[lr][lc]) {
          plate.push({ x, y: 1, z, gx, gz, isDark: false, base: false, label: true, delay })
          top = 1
          fixed = undefined
        }
      }
      topAt.set(`${x},${z}`, { y: top, gx, gz, isDark, fixed })
    }
  }

  // Re-seat the character so its lowest voxel sits on the slab at y = 1.
  const raw = character?.voxels || []
  const ys = raw.map((v) => v.y)
  const minY = ys.length ? Math.min(...ys) : 0
  const spanY = Math.max(1, (ys.length ? Math.max(...ys) : 0) - minY)
  const placed = new Set()
  const avatar = []
  raw.forEach((v, i) => {
    const y = v.y - minY + 1
    const k = key(v.x, y, v.z)
    if (placed.has(k)) return // characters overlap themselves; one voxel per cell
    placed.add(k)
    const cell = topAt.get(`${v.x},${v.z}`) || { y: 0, gx: -1, gz: -1, isDark: false }
    avatar.push({
      x: v.x, y, z: v.z,
      color: v.color,
      sinkY: cell.y,
      sinkGx: cell.gx, sinkGz: cell.gz, sinkDark: cell.isDark, sinkFixed: cell.fixed,
      heightRank: (v.y - minY) / spanY,
      delay: i % 12,
    })
  })

  // The avatar takes over the cells it stands in so nothing z-fights. Never the
  // base slab (the avatar starts at y=1), so the plate stays a solid sheet.
  const taken = new Set(avatar.map((a) => key(a.x, a.y, a.z)))
  const keptPlate = plate.filter((p) => !taken.has(key(p.x, p.y, p.z)))

  const supports = buildSupports([...keptPlate, ...avatar])

  const spanX = xHi - xLo + 3
  const spanZ = zHi - zLo + 3
  return {
    plate: keptPlate,
    avatar,
    supports,
    n,
    off,
    spanX,
    spanZ,
    span: Math.max(spanX, spanZ),
    center: { x: (xLo + xHi) / 2, z: (zLo + zHi) / 2 },
    hasLabel: !!label,
    hasLogo: logoAt.size > 0,
  }
}

/**
 * Colour pass. Cheap enough to re-run on every hue tick.
 * The base slab is the light tone — the surface of light modules, and hidden under
 * the dark caps — so a raised dark cap on a light sheet is the code in relief.
 */
export function paintStructure(structure, palFn) {
  const { plate, avatar, supports } = structure
  const plateColors = plate.map((p) => {
    if (p.base) return p.logoColor || LIGHT_COLOR
    if (p.label) return palFn(p.x * 2, p.z * 2, true)
    return palFn(p.gx, p.gz, true)
  })
  const avatarRest = avatar.map((a) => a.color)
  const avatarSunk = avatar.map((a) => (
    a.sinkFixed || (a.sinkGx < 0 ? LIGHT_COLOR : palFn(a.sinkGx, a.sinkGz, a.sinkDark))
  ))
  const supportColors = supports.map((s) => s.color)
  return { plateColors, avatarRest, avatarSunk, supportColors }
}

/** Index of the plate cell to glow gold in the diorama. Null if the code has no cap. */
export function findGoldenCell(structure, pick) {
  const caps = []
  structure.plate.forEach((p, i) => { if (!p.base && p.isDark) caps.push(i) })
  if (!caps.length) return null
  return caps[Math.min(caps.length - 1, Math.floor(pick * caps.length))]
}

/** Flat cell list at rest, for export. */
export function modelCells(structure, colors) {
  const out = []
  structure.plate.forEach((p, i) => out.push({ x: p.x, y: p.y, z: p.z, color: colors.plateColors[i] }))
  structure.avatar.forEach((a, i) => out.push({ x: a.x, y: a.y, z: a.z, color: colors.avatarRest[i] }))
  structure.supports.forEach((s, i) => out.push({ x: s.x, y: s.y, z: s.z, color: colors.supportColors[i] }))
  return out
}
