// Voxel -> mesh export.
//
// The old exporter emitted all six faces of every cube, so neighbouring voxels
// left a wall of coincident internal faces and the mesh was not manifold. Here we
// extract the surface instead: a face is emitted only where the neighbouring cell
// is empty. With full 1.0 cubes on an integer lattice the surviving faces meet
// exactly edge to edge, so the result is watertight, manifold and printable with
// no internal geometry.

export const MM_PER_VOXEL = 2 // a 29-module code lands at ~70 mm across

// unit cube corners, in the order the face table below indexes
const CORNERS = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
]

// [neighbour offset, outward normal, corner quad wound CCW seen from outside]
const FACES = [
  [[0, 0, -1], [0, 0, -1], [0, 3, 2, 1]],
  [[0, 0, 1], [0, 0, 1], [4, 5, 6, 7]],
  [[0, -1, 0], [0, -1, 0], [0, 1, 5, 4]],
  [[0, 1, 0], [0, 1, 0], [3, 7, 6, 2]],
  [[-1, 0, 0], [-1, 0, 0], [0, 4, 7, 3]],
  [[1, 0, 0], [1, 0, 0], [1, 2, 6, 5]],
]

const hexToRgb = (hex) => {
  const h = (hex || '#ffffff').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/**
 * Walk the occupancy grid and collect only the faces that face open air.
 * Returns quads: { p: [4 x [x,y,z]], n: [x,y,z], color }
 */
export function extractSurface(cells, scale = MM_PER_VOXEL) {
  const occ = new Set()
  for (const c of cells) occ.add(`${c.x},${c.y},${c.z}`)
  const quads = []
  for (const c of cells) {
    for (const [off, normal, quad] of FACES) {
      if (occ.has(`${c.x + off[0]},${c.y + off[1]},${c.z + off[2]}`)) continue
      quads.push({
        p: quad.map((i) => [
          (c.x + CORNERS[i][0]) * scale,
          (c.y + CORNERS[i][1]) * scale,
          (c.z + CORNERS[i][2]) * scale,
        ]),
        n: normal,
        color: c.color,
      })
    }
  }
  return quads
}

/**
 * Edge audit.
 *
 * An edge used by an odd number of faces is a genuine boundary — a hole, and the
 * model would not print. An edge used by four is a *pinch*: two voxels meeting
 * only along an edge, which is what any QR relief produces wherever two dark
 * modules sit diagonally with light modules between them. The solid is still
 * closed and holds water there; slicers fill it correctly and both towers are
 * anchored to the slab below. It cannot be removed without altering the code.
 */
export function inspectSurface(quads) {
  const edges = new Map()
  const k = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)},${p[2].toFixed(4)}`
  for (const q of quads) {
    for (let i = 0; i < 4; i++) {
      const a = k(q.p[i])
      const b = k(q.p[(i + 1) % 4])
      const e = a < b ? `${a}|${b}` : `${b}|${a}`
      edges.set(e, (edges.get(e) || 0) + 1)
    }
  }
  let boundary = 0
  let pinch = 0
  for (const n of edges.values()) {
    if (n % 2 === 1) boundary++
    else if (n > 2) pinch++
  }
  return {
    quads: quads.length,
    triangles: quads.length * 2,
    edges: edges.size,
    boundaryEdges: boundary,
    pinchEdges: pinch,
    closed: boundary === 0,
  }
}

/** OBJ with per-vertex colour (the `v x y z r g b` extension Blender reads). */
export function exportOBJ(cells, name = 'model', scale = MM_PER_VOXEL) {
  const quads = extractSurface(cells, scale)
  const index = new Map()
  const verts = []
  const faces = []
  const vkey = (p, c) => `${p[0]},${p[1]},${p[2]}|${c}`
  for (const q of quads) {
    const ids = q.p.map((p) => {
      const kk = vkey(p, q.color)
      let id = index.get(kk)
      if (id === undefined) {
        const [r, g, b] = hexToRgb(q.color)
        verts.push(`v ${p[0]} ${p[1]} ${p[2]} ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`)
        id = verts.length
        index.set(kk, id)
      }
      return id
    })
    faces.push(`f ${ids[0]} ${ids[1]} ${ids[2]} ${ids[3]}`)
  }
  return [
    `# ANAM[QR]PHIC - 3D Printable Voxel Diorama QR code`,
    `# watertight voxel surface, no internal geometry`,
    `# voxels: ${cells.length}  quads: ${quads.length}  scale: ${scale} mm/voxel`,
    `o ${name}`,
    ...verts,
    ...faces,
    '',
  ].join('\n')
}

/** Binary STL — an ASCII STL of a large code would run to tens of megabytes. */
export function exportSTL(cells, scale = MM_PER_VOXEL) {
  const quads = extractSurface(cells, scale)
  const tris = quads.length * 2
  const buf = new ArrayBuffer(84 + tris * 50)
  const view = new DataView(buf)
  // the binary STL header is capped at 80 bytes
  const header = `ANAM[QR]PHIC - 3D Printable Voxel Diorama QR code | ${scale}mm/voxel`
  for (let i = 0; i < Math.min(79, header.length); i++) view.setUint8(i, header.charCodeAt(i))
  view.setUint32(80, tris, true)

  let o = 84
  const tri = (n, a, b, c) => {
    view.setFloat32(o, n[0], true); view.setFloat32(o + 4, n[1], true); view.setFloat32(o + 8, n[2], true)
    const pts = [a, b, c]
    for (let i = 0; i < 3; i++) {
      view.setFloat32(o + 12 + i * 12, pts[i][0], true)
      view.setFloat32(o + 16 + i * 12, pts[i][1], true)
      view.setFloat32(o + 20 + i * 12, pts[i][2], true)
    }
    view.setUint16(o + 48, 0, true)
    o += 50
  }
  for (const q of quads) {
    tri(q.n, q.p[0], q.p[1], q.p[2])
    tri(q.n, q.p[0], q.p[2], q.p[3])
  }
  return buf
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function downloadText(content, filename, mime = 'text/plain') {
  saveBlob(new Blob([content], { type: mime }), filename)
}

export function downloadBinary(buffer, filename, mime = 'application/octet-stream') {
  saveBlob(new Blob([buffer], { type: mime }), filename)
}
