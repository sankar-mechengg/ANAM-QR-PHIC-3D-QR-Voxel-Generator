// Voxel character definitions - each is {id, name, emoji, desc, voxels:[{x,y,z,color}]}
// Coordinates are an integer grid, origin centred, y is up. The model builder
// re-seats every character so its lowest voxel rests on the QR plate, and drops
// support columns under anything left floating, so a model may have gaps here.

const PALETTE = {
  gold: '#FACC15',
  goldDark: '#EAB308',
  dark: '#111827',
  white: '#F8FAFC',
  black: '#0f0f0f',
  red: '#EF4444',
  blue: '#3B82F6',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  green: '#22C55E',
  orange: '#F97316',
  // scenery tones
  bark: '#6B4A2F',
  barkDark: '#4A3320',
  leaf: '#2F8F3E',
  leafDark: '#1F6B2C',
  leafLight: '#4FBF5C',
  pine: '#1B5E3A',
  sakura: '#F9A8D4',
  sakuraLight: '#FBCFE8',
  sakuraDeep: '#EC7FB4',
  stone: '#8B8F98',
  stoneDark: '#5C616B',
  sand: '#E8D5A8',
  cream: '#F5EBD8',
  brick: '#B4533C',
  roof: '#8C3A2B',
  moss: '#4E7C3A',
  snow: '#FFFFFF',
  ice: '#DBEAFE',
  brown: '#8B5E3C',
  brownDark: '#5E3F28',
  tan: '#C89B6A',
}

// ---- shape helpers -------------------------------------------------------
function fillRect(v, { x0, x1, y0, y1, z0, z1, c }) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) v.push({ x, y, z, color: c })
}
function add(v, x, y, z, c) { v.push({ x, y, z, color: c }) }
function col(v, x, z, y0, y1, c) { for (let y = y0; y <= y1; y++) v.push({ x, y, z, color: c }) }
function disc(v, cx, cy, cz, r, c) {
  for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (x * x + z * z <= r * r + 0.6) v.push({ x: cx + x, y: cy, z: cz + z, color: c })
}
// solid ellipsoid — canopies, boulders, snowballs
function blob(v, cx, cy, cz, rx, ry, rz, c) {
  for (let x = -rx; x <= rx; x++) for (let y = -ry; y <= ry; y++) for (let z = -rz; z <= rz; z++) {
    if ((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2 <= 1.02) v.push({ x: cx + x, y: cy + y, z: cz + z, color: c })
  }
}
// stacked tapering discs — conifers, pagoda roofs
function cone(v, cx, cy, cz, r0, layers, c) {
  for (let l = 0; l < layers; l++) {
    const r = r0 - l
    if (r < 0) break
    disc(v, cx, cy + l, cz, r, c)
  }
}
// speckle a shape with a second colour, deterministically
function speckle(v, from, c, every) {
  for (let i = from; i < v.length; i += every) v[i] = { ...v[i], color: c }
}

export const CHARACTERS = [
  // ---- trees ------------------------------------------------------------
  {
    id: 'sakura', name: 'Cherry Blossom', emoji: '🌸', desc: 'Sakura in full bloom', group: 'Trees',
    voxels: (() => {
      const v = []
      col(v, 0, 0, 0, 6, PALETTE.bark)
      add(v, 1, 3, 0, PALETTE.barkDark); add(v, -1, 4, 0, PALETTE.barkDark)
      add(v, 0, 4, 1, PALETTE.barkDark); add(v, 0, 3, -1, PALETTE.barkDark)
      const canopy = v.length
      blob(v, 0, 9, 0, 4, 3, 4, PALETTE.sakura)
      speckle(v, canopy, PALETTE.sakuraLight, 4)
      speckle(v, canopy + 2, PALETTE.sakuraDeep, 7)
      add(v, 2, 5, 2, PALETTE.sakuraLight); add(v, -3, 6, 1, PALETTE.sakura)
      return v
    })(),
  },
  {
    id: 'pine', name: 'Pine Tree', emoji: '🌲', desc: 'Stacked winter conifer', group: 'Trees',
    voxels: (() => {
      const v = []
      col(v, 0, 0, 0, 3, PALETTE.barkDark)
      cone(v, 0, 3, 0, 4, 3, PALETTE.pine)
      cone(v, 0, 6, 0, 3, 3, PALETTE.leafDark)
      cone(v, 0, 9, 0, 2, 3, PALETTE.pine)
      add(v, 0, 12, 0, PALETTE.leafLight)
      return v
    })(),
  },
  {
    id: 'oak', name: 'Old Oak', emoji: '🌳', desc: 'Broad summer canopy', group: 'Trees',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -1, x1: 0, y0: 0, y1: 4, z0: -1, z1: 0, c: PALETTE.bark })
      add(v, 2, 4, 0, PALETTE.barkDark); add(v, -2, 5, 0, PALETTE.barkDark)
      const c0 = v.length
      blob(v, 0, 8, 0, 5, 3, 5, PALETTE.leaf)
      speckle(v, c0, PALETTE.leafDark, 5)
      speckle(v, c0 + 1, PALETTE.leafLight, 9)
      return v
    })(),
  },
  {
    id: 'bonsai', name: 'Bonsai', emoji: '🎋', desc: 'Potted and pruned', group: 'Trees',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -2, x1: 2, y0: 0, y1: 1, z0: -2, z1: 2, c: PALETTE.brick })
      fillRect(v, { x0: -2, x1: 2, y0: 2, y1: 2, z0: -2, z1: 2, c: PALETTE.brownDark })
      col(v, 0, 0, 3, 5, PALETTE.bark)
      add(v, 1, 6, 0, PALETTE.bark); add(v, 2, 6, 0, PALETTE.bark)
      add(v, -1, 6, 0, PALETTE.bark)
      disc(v, 2, 7, 0, 2, PALETTE.leafDark)
      disc(v, -2, 7, 0, 1, PALETTE.leaf)
      disc(v, 0, 8, 0, 2, PALETTE.leaf)
      return v
    })(),
  },
  {
    id: 'palm', name: 'Palm Tree', emoji: '🌴', desc: 'Island fronds', group: 'Trees',
    voxels: (() => {
      const v = []
      for (let y = 0; y <= 8; y++) add(v, y > 5 ? 1 : 0, y, 0, y % 2 ? PALETTE.bark : PALETTE.tan)
      const t = 1
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (let i = 1; i <= 3; i++) add(v, t + dx * i, 9 - (i > 2 ? 1 : 0), dz * i, PALETTE.leaf)
        add(v, t + dx * 3, 8, dz * 3, PALETTE.leafDark)
      }
      disc(v, t, 9, 0, 1, PALETTE.leafDark)
      add(v, t, 8, 1, PALETTE.gold); add(v, t + 1, 8, 0, PALETTE.gold)
      return v
    })(),
  },

  // ---- nature scenery ---------------------------------------------------
  {
    id: 'mushroom', name: 'Toadstool', emoji: '🍄', desc: 'Spotted red cap', group: 'Nature',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: 0, x1: 0, y0: 0, y1: 3, z0: 0, z1: 0, c: PALETTE.cream })
      add(v, 1, 1, 0, PALETTE.cream); add(v, -1, 1, 0, PALETTE.cream)
      disc(v, 0, 4, 0, 3, PALETTE.red)
      disc(v, 0, 5, 0, 2, PALETTE.red)
      add(v, 0, 6, 0, PALETTE.red)
      add(v, 2, 4, 0, PALETTE.white); add(v, -1, 4, 2, PALETTE.white)
      add(v, 0, 5, -1, PALETTE.white); add(v, 1, 5, 1, PALETTE.white)
      disc(v, 0, 3, 0, 2, PALETTE.sand)
      return v
    })(),
  },
  {
    id: 'cactus', name: 'Saguaro', emoji: '🌵', desc: 'Desert cactus in bloom', group: 'Nature',
    voxels: (() => {
      const v = []
      col(v, 0, 0, 0, 7, PALETTE.leafDark)
      col(v, 0, 1, 0, 6, PALETTE.leaf)
      col(v, 2, 0, 3, 5, PALETTE.leafDark)
      add(v, 1, 3, 0, PALETTE.leafDark)
      col(v, -2, 0, 4, 6, PALETTE.leafDark)
      add(v, -1, 4, 0, PALETTE.leafDark)
      add(v, 0, 8, 0, PALETTE.pink); add(v, 2, 6, 0, PALETTE.pink); add(v, -2, 7, 0, PALETTE.sakura)
      disc(v, 0, 0, 0, 2, PALETTE.sand)
      return v
    })(),
  },
  {
    id: 'flower', name: 'Daisy', emoji: '🌼', desc: 'Single tall bloom', group: 'Nature',
    voxels: (() => {
      const v = []
      col(v, 0, 0, 0, 5, PALETTE.leaf)
      add(v, 1, 2, 0, PALETTE.leafDark); add(v, 2, 2, 0, PALETTE.leafDark)
      add(v, -1, 3, 0, PALETTE.leafDark); add(v, -2, 3, 0, PALETTE.leafDark)
      add(v, 0, 6, 0, PALETTE.gold)
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        add(v, dx, 6, dz, PALETTE.white)
      }
      for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) add(v, dx, 6, dz, PALETTE.sakuraLight)
      return v
    })(),
  },
  {
    id: 'rock', name: 'Mossy Boulder', emoji: '🪨', desc: 'Weathered stone', group: 'Nature',
    voxels: (() => {
      const v = []
      const b = v.length
      blob(v, 0, 2, 0, 4, 2, 3, PALETTE.stone)
      speckle(v, b, PALETTE.stoneDark, 6)
      blob(v, 2, 4, 1, 2, 1, 2, PALETTE.stone)
      disc(v, 0, 4, 0, 2, PALETTE.moss)
      add(v, -3, 1, 2, PALETTE.moss); add(v, 3, 1, -2, PALETTE.moss)
      return v
    })(),
  },

  // ---- buildings --------------------------------------------------------
  {
    id: 'pagoda', name: 'Pagoda', emoji: '⛩️', desc: 'Three-tier tower', group: 'Buildings',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -2, x1: 2, y0: 0, y1: 0, z0: -2, z1: 2, c: PALETTE.stone })
      for (let t = 0; t < 3; t++) {
        const y = 1 + t * 4
        const r = 2 - t === 0 ? 2 : 2
        fillRect(v, { x0: -(2 - t), x1: 2 - t, y0: y, y1: y + 1, z0: -(2 - t), z1: 2 - t, c: PALETTE.cream })
        disc(v, 0, y + 2, 0, 3 - t, PALETTE.roof)
        disc(v, 0, y + 3, 0, 2 - t, PALETTE.brick)
        void r
      }
      add(v, 0, 13, 0, PALETTE.gold); add(v, 0, 14, 0, PALETTE.gold)
      return v
    })(),
  },
  {
    id: 'cottage', name: 'Cottage', emoji: '🏡', desc: 'Thatched little house', group: 'Buildings',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -3, x1: 3, y0: 0, y1: 3, z0: -2, z1: 2, c: PALETTE.cream })
      fillRect(v, { x0: -1, x1: 0, y0: 0, y1: 2, z0: 3, z1: 3, c: PALETTE.brownDark })
      add(v, -3, 2, 3, PALETTE.ice); add(v, 3, 2, 3, PALETTE.ice)
      for (let l = 0; l <= 3; l++) {
        fillRect(v, { x0: -(3 - l), x1: 3 - l, y0: 4 + l, y1: 4 + l, z0: -3 + l, z1: 3 - l, c: l % 2 ? PALETTE.brick : PALETTE.roof })
      }
      col(v, 2, -1, 5, 8, PALETTE.stone)
      add(v, 2, 9, -1, PALETTE.white)
      return v
    })(),
  },
  {
    id: 'lighthouse', name: 'Lighthouse', emoji: '🗼', desc: 'Striped beacon', group: 'Buildings',
    voxels: (() => {
      const v = []
      disc(v, 0, 0, 0, 3, PALETTE.stoneDark)
      disc(v, 0, 1, 0, 3, PALETTE.stone)
      for (let y = 2; y <= 11; y++) {
        const r = y < 6 ? 2 : 1
        disc(v, 0, y, 0, r, Math.floor((y - 2) / 2) % 2 ? PALETTE.red : PALETTE.white)
      }
      disc(v, 0, 12, 0, 2, PALETTE.dark)
      disc(v, 0, 13, 0, 1, PALETTE.gold)
      add(v, 0, 14, 0, PALETTE.white)
      disc(v, 0, 15, 0, 1, PALETTE.red)
      return v
    })(),
  },
  {
    id: 'torii', name: 'Torii Gate', emoji: '⛩', desc: 'Vermilion shrine gate', group: 'Buildings',
    voxels: (() => {
      const v = []
      col(v, -3, 0, 0, 7, PALETTE.brick)
      col(v, 3, 0, 0, 7, PALETTE.brick)
      fillRect(v, { x0: -4, x1: 4, y0: 8, y1: 8, z0: 0, z1: 0, c: PALETTE.brick })
      fillRect(v, { x0: -5, x1: 5, y0: 9, y1: 9, z0: 0, z1: 0, c: PALETTE.roof })
      fillRect(v, { x0: -3, x1: 3, y0: 6, y1: 6, z0: 0, z1: 0, c: PALETTE.brick })
      add(v, 0, 7, 0, PALETTE.dark)
      add(v, -3, 0, 1, PALETTE.stone); add(v, 3, 0, 1, PALETTE.stone)
      add(v, -3, 0, -1, PALETTE.stone); add(v, 3, 0, -1, PALETTE.stone)
      return v
    })(),
  },

  // ---- characters -------------------------------------------------------
  {
    id: 'penguin', name: 'Penguin', emoji: '🐧', desc: 'Tuxedo bird', group: 'Characters',
    voxels: (() => {
      const v = []
      blob(v, 0, 3, 0, 2, 3, 2, PALETTE.dark)
      fillRect(v, { x0: -1, x1: 1, y0: 1, y1: 4, z0: 2, z1: 2, c: PALETTE.white })
      blob(v, 0, 7, 0, 2, 2, 2, PALETTE.dark)
      add(v, -1, 7, 2, PALETTE.white); add(v, 1, 7, 2, PALETTE.white)
      add(v, -1, 7, 3, PALETTE.black); add(v, 1, 7, 3, PALETTE.black)
      add(v, 0, 6, 3, PALETTE.orange); add(v, 0, 6, 4, PALETTE.orange)
      add(v, -3, 3, 0, PALETTE.dark); add(v, 3, 3, 0, PALETTE.dark)
      add(v, -1, 0, 1, PALETTE.orange); add(v, 1, 0, 1, PALETTE.orange)
      add(v, -1, 0, 2, PALETTE.orange); add(v, 1, 0, 2, PALETTE.orange)
      return v
    })(),
  },
  {
    id: 'owl', name: 'Night Owl', emoji: '🦉', desc: 'Round and watchful', group: 'Characters',
    voxels: (() => {
      const v = []
      blob(v, 0, 4, 0, 3, 4, 2, PALETTE.brown)
      fillRect(v, { x0: -1, x1: 1, y0: 2, y1: 5, z0: 2, z1: 2, c: PALETTE.tan })
      add(v, -2, 7, 2, PALETTE.gold); add(v, 2, 7, 2, PALETTE.gold)
      add(v, -2, 7, 3, PALETTE.black); add(v, 2, 7, 3, PALETTE.black)
      add(v, 0, 6, 3, PALETTE.orange)
      add(v, -3, 9, 0, PALETTE.brownDark); add(v, 3, 9, 0, PALETTE.brownDark)
      add(v, -3, 4, 0, PALETTE.brownDark); add(v, 3, 4, 0, PALETTE.brownDark)
      add(v, -1, 0, 2, PALETTE.orange); add(v, 1, 0, 2, PALETTE.orange)
      return v
    })(),
  },
  {
    id: 'deer', name: 'Forest Deer', emoji: '🦌', desc: 'Antlered and alert', group: 'Characters',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -1, x1: 1, y0: 4, y1: 6, z0: -2, z1: 2, c: PALETTE.brown })
      add(v, 0, 5, 2, PALETTE.cream); add(v, 0, 4, 1, PALETTE.cream)
      col(v, -1, -2, 0, 3, PALETTE.brownDark); col(v, 1, -2, 0, 3, PALETTE.brownDark)
      col(v, -1, 2, 0, 3, PALETTE.brownDark); col(v, 1, 2, 0, 3, PALETTE.brownDark)
      fillRect(v, { x0: 0, x1: 0, y0: 7, y1: 8, z0: 2, z1: 3, c: PALETTE.brown })
      add(v, 0, 9, 3, PALETTE.brown)
      add(v, -1, 9, 3, PALETTE.black); add(v, 1, 9, 3, PALETTE.black)
      add(v, 0, 8, 4, PALETTE.dark)
      for (const s of [-1, 1]) {
        add(v, s, 10, 3, PALETTE.tan); add(v, s * 2, 11, 3, PALETTE.tan)
        add(v, s * 2, 12, 3, PALETTE.tan); add(v, s * 2, 12, 2, PALETTE.tan)
      }
      add(v, 0, 6, -3, PALETTE.cream)
      return v
    })(),
  },
  {
    id: 'snowman', name: 'Snowman', emoji: '⛄', desc: 'Three balls and a hat', group: 'Characters',
    voxels: (() => {
      const v = []
      blob(v, 0, 3, 0, 3, 3, 3, PALETTE.snow)
      blob(v, 0, 8, 0, 2, 2, 2, PALETTE.snow)
      blob(v, 0, 11, 0, 2, 2, 2, PALETTE.snow)
      add(v, -1, 11, 2, PALETTE.black); add(v, 1, 11, 2, PALETTE.black)
      add(v, 0, 10, 2, PALETTE.orange); add(v, 0, 10, 3, PALETTE.orange)
      add(v, 0, 8, 2, PALETTE.dark); add(v, 0, 4, 2, PALETTE.dark); add(v, 0, 2, 2, PALETTE.dark)
      disc(v, 0, 13, 0, 2, PALETTE.dark)
      disc(v, 0, 14, 0, 1, PALETTE.dark); disc(v, 0, 15, 0, 1, PALETTE.dark)
      for (let i = 2; i <= 4; i++) { add(v, -i, 8, 0, PALETTE.bark); add(v, i, 8, 0, PALETTE.bark) }
      add(v, -4, 9, 0, PALETTE.bark); add(v, 4, 9, 0, PALETTE.bark)
      fillRect(v, { x0: -2, x1: 2, y0: 10, y1: 10, z0: 2, z1: 2, c: PALETTE.red })
      return v
    })(),
  },

  // ---- original set -----------------------------------------------------
  {
    id: 'robot', name: 'Neo Robot', emoji: '🤖', desc: 'Classic biped with antenna', group: 'Characters',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -1, x1: 1, y0: 6, y1: 8, z0: -1, z1: 1, c: PALETTE.white })
      add(v, 0, 9, 0, PALETTE.red); add(v, 0, 10, 0, PALETTE.red)
      add(v, -1, 7, 2, PALETTE.cyan); add(v, 1, 7, 2, PALETTE.cyan)
      fillRect(v, { x0: -1, x1: 1, y0: 2, y1: 5, z0: -1, z1: 0, c: PALETTE.blue })
      add(v, 0, 4, 1, PALETTE.red); add(v, 0, 3, 1, PALETTE.gold)
      fillRect(v, { x0: -3, x1: -2, y0: 2, y1: 5, z0: -1, z1: 0, c: PALETTE.white })
      fillRect(v, { x0: 2, x1: 3, y0: 2, y1: 5, z0: -1, z1: 0, c: PALETTE.white })
      add(v, -3, 1, 0, PALETTE.gold); add(v, 3, 1, 0, PALETTE.gold)
      fillRect(v, { x0: -1, x1: 0, y0: -2, y1: 1, z0: -1, z1: 0, c: PALETTE.dark })
      fillRect(v, { x0: 1, x1: 2, y0: -2, y1: 1, z0: -1, z1: 0, c: PALETTE.dark })
      add(v, -1, -3, 0, PALETTE.gold); add(v, 0, -3, 0, PALETTE.gold); add(v, 1, -3, 0, PALETTE.gold); add(v, 2, -3, 0, PALETTE.gold)
      return v
    })(),
  },
  {
    id: 'dragon', name: 'Voxel Dragon', emoji: '🐉', desc: 'Tiny wings & tail', group: 'Characters',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -1, x1: 1, y0: 1, y1: 3, z0: -2, z1: 1, c: PALETTE.green })
      fillRect(v, { x0: -1, x1: 1, y0: 3, y1: 5, z0: 2, z1: 3, c: PALETTE.green })
      add(v, 0, 6, 3, PALETTE.orange)
      add(v, -1, 4, 4, PALETTE.white); add(v, 1, 4, 4, PALETTE.white)
      add(v, -1, 5, 4, PALETTE.red); add(v, 1, 5, 4, PALETTE.red)
      fillRect(v, { x0: -3, x1: -2, y0: 2, y1: 3, z0: -1, z1: 0, c: PALETTE.purple })
      fillRect(v, { x0: 2, x1: 3, y0: 2, y1: 3, z0: -1, z1: 0, c: PALETTE.purple })
      add(v, 0, 2, -3, PALETTE.green); add(v, 0, 2, -4, PALETTE.green); add(v, 0, 3, -5, PALETTE.orange)
      add(v, -1, 0, 0, PALETTE.dark); add(v, 1, 0, 0, PALETTE.dark); add(v, -1, 0, 1, PALETTE.dark); add(v, 1, 0, 1, PALETTE.dark)
      add(v, 0, 2, 0, PALETTE.white); add(v, 0, 1, 0, PALETTE.white)
      return v
    })(),
  },
  {
    id: 'astronaut', name: 'Star Walker', emoji: '👨‍🚀', desc: 'Chibi astronaut', group: 'Characters',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -1, x1: 1, y0: 6, y1: 8, z0: -1, z1: 1, c: PALETTE.white })
      add(v, 0, 7, 2, '#7DD3FC'); add(v, 1, 7, 2, '#7DD3FC'); add(v, -1, 7, 2, '#7DD3FC'); add(v, 0, 7, 1, '#7DD3FC')
      fillRect(v, { x0: -1, x1: 1, y0: 3, y1: 5, z0: -1, z1: 0, c: PALETTE.white })
      fillRect(v, { x0: -1, x1: 1, y0: 3, y1: 5, z0: -2, z1: -2, c: PALETTE.dark })
      add(v, 0, 5, 0, PALETTE.blue); add(v, 0, 4, 0, PALETTE.red)
      add(v, -2, 4, 0, PALETTE.white); add(v, -2, 3, 0, PALETTE.white)
      add(v, 2, 4, 0, PALETTE.white); add(v, 2, 3, 0, PALETTE.white)
      fillRect(v, { x0: -1, x1: 0, y0: -1, y1: 2, z0: -1, z1: 0, c: PALETTE.white })
      fillRect(v, { x0: 1, x1: 1, y0: -1, y1: 2, z0: -1, z1: 0, c: PALETTE.white })
      add(v, -1, -2, 0, PALETTE.dark); add(v, 1, -2, 0, PALETTE.dark)
      return v
    })(),
  },
  {
    id: 'knight', name: 'Voxel Knight', emoji: '⚔️', desc: 'Armored guardian', group: 'Characters',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -1, x1: 1, y0: 6, y1: 8, z0: 0, z1: 0, c: '#9CA3AF' })
      add(v, 0, 7, 1, '#111')
      fillRect(v, { x0: -1, x1: 1, y0: 3, y1: 5, z0: -1, z1: 0, c: PALETTE.blue })
      add(v, 0, 4, 1, PALETTE.gold)
      fillRect(v, { x0: -2, x1: -2, y0: 3, y1: 5, z0: 0, z1: 0, c: '#9CA3AF' })
      fillRect(v, { x0: 2, x1: 2, y0: 3, y1: 5, z0: 0, z1: 0, c: '#9CA3AF' })
      add(v, -3, 4, 0, '#9CA3AF'); add(v, -3, 5, 0, '#E5E7EB'); add(v, -3, 6, 0, '#E5E7EB'); add(v, -3, 3, 0, PALETTE.gold)
      add(v, 3, 4, 0, PALETTE.red); add(v, 3, 3, 0, PALETTE.red)
      fillRect(v, { x0: -1, x1: 1, y0: -1, y1: 2, z0: -1, z1: 0, c: '#9CA3AF' })
      add(v, -1, -2, 0, '#4B5563'); add(v, 1, -2, 0, '#4B5563')
      return v
    })(),
  },
  {
    id: 'cat', name: 'Neko Cube', emoji: '🐱', desc: 'Lucky block cat', group: 'Characters',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -2, x1: 2, y0: 5, y1: 7, z0: -1, z1: 1, c: PALETTE.orange })
      add(v, -2, 8, 0, PALETTE.orange); add(v, 2, 8, 0, PALETTE.orange)
      add(v, -2, 9, 0, PALETTE.pink); add(v, 2, 9, 0, PALETTE.pink)
      add(v, -1, 6, 2, PALETTE.black); add(v, 1, 6, 2, PALETTE.black)
      add(v, 0, 5, 2, PALETTE.pink)
      fillRect(v, { x0: -1, x1: 1, y0: 2, y1: 4, z0: -1, z1: 1, c: PALETTE.white })
      add(v, 0, 3, 2, PALETTE.gold)
      add(v, -1, 1, 1, PALETTE.orange); add(v, 1, 1, 1, PALETTE.orange)
      add(v, -1, 0, 0, PALETTE.white); add(v, 1, 0, 0, PALETTE.white)
      add(v, 0, 2, -2, PALETTE.orange); add(v, 0, 3, -3, PALETTE.orange); add(v, 1, 3, -3, PALETTE.white)
      return v
    })(),
  },
  {
    id: 'invader', name: 'Space Invader', emoji: '👾', desc: 'Retro 8-bit alien', group: 'Characters',
    voxels: (() => {
      const v = []
      const pts = [[-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [-3, 3], [3, 3], [-3, 2], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2], [3, 2], [-2, 1], [2, 1], [-1, 0], [1, 0]]
      pts.forEach(([x, y]) => { add(v, x, y, 0, PALETTE.green); add(v, x, y, 1, PALETTE.green) })
      add(v, -2, 5, 0, PALETTE.green); add(v, 2, 5, 0, PALETTE.green)
      add(v, -1, 3, 1, PALETTE.white); add(v, 1, 3, 1, PALETTE.white)
      return v
    })(),
  },
  {
    id: 'golem', name: 'Crystal Golem', emoji: '🗿', desc: 'Floating crystal core', group: 'Characters',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -1, x1: 1, y0: 0, y1: 3, z0: -1, z1: 1, c: '#6B7280' })
      fillRect(v, { x0: 0, x1: 0, y0: 4, y1: 6, z0: 0, z1: 0, c: PALETTE.cyan })
      add(v, 0, 7, 0, PALETTE.white); add(v, 0, 5, 1, PALETTE.purple)
      add(v, -2, 2, 0, '#6B7280'); add(v, -3, 2, 0, '#6B7280')
      add(v, 2, 2, 0, '#6B7280'); add(v, 3, 2, 0, '#6B7280')
      fillRect(v, { x0: -1, x1: 1, y0: 4, y1: 5, z0: -1, z1: 0, c: '#374151' })
      add(v, -1, 4, 1, PALETTE.cyan); add(v, 1, 4, 1, PALETTE.cyan)
      return v
    })(),
  },
  {
    id: 'doge', name: 'Voxel Fox', emoji: '🦊', desc: 'Cute low-poly fox', group: 'Characters',
    voxels: (() => {
      const v = []
      fillRect(v, { x0: -1, x1: 1, y0: 5, y1: 7, z0: 0, z1: 2, c: PALETTE.orange })
      add(v, -1, 8, 1, PALETTE.orange); add(v, 1, 8, 1, PALETTE.orange)
      add(v, 0, 6, 3, PALETTE.white); add(v, 0, 5, 3, PALETTE.black)
      fillRect(v, { x0: -1, x1: 1, y0: 2, y1: 4, z0: -1, z1: 1, c: PALETTE.orange })
      add(v, 0, 3, 1, PALETTE.white)
      add(v, -1, 1, 0, PALETTE.white); add(v, 1, 1, 0, PALETTE.white)
      add(v, 0, 2, -2, PALETTE.orange); add(v, 1, 2, -3, PALETTE.white)
      return v
    })(),
  },
]

export const CHARACTER_GROUPS = ['Trees', 'Nature', 'Buildings', 'Characters']
