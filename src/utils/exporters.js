// Simple OBJ & STL ASCII exporters for voxels
// Each voxel is a 0.9 sized cube centered at (x,y,z) with edge 1

function cubeVertices(cx, cy, cz, s=0.45) {
  // 8 vertices
  return [
    [cx-s, cy-s, cz-s],
    [cx+s, cy-s, cz-s],
    [cx+s, cy+s, cz-s],
    [cx-s, cy+s, cz-s],
    [cx-s, cy-s, cz+s],
    [cx+s, cy-s, cz+s],
    [cx+s, cy+s, cz+s],
    [cx-s, cy+s, cz+s],
  ]
}
const FACES = [
  [0,1,2,3], // -z
  [4,7,6,5], // +z
  [0,4,5,1], // -y
  [2,6,7,3], // +y
  [0,3,7,4], // -x
  [1,5,6,2], // +x
]

export function exportOBJ(voxels, name='model') {
  let obj = `# OBJ generated from 3D QR Voxel Studio\n# voxels: ${voxels.length}\no ${name}\n`
  let vIdx = 1
  // we emit vertices per cube, then faces
  // To keep file simple, we DON'T deduplicate vertices
  let faceLines = ''
  voxels.forEach((vox)=>{
    const verts = cubeVertices(vox.x, vox.y, vox.z)
    verts.forEach(v=>{ obj+=`v ${v[0]} ${v[1]} ${v[2]}\n` })
    FACES.forEach(f=>{
      // quad as 2 triangles? OBJ supports quads, but for blender both fine. Emit as f with 4 verts
      const a = vIdx+f[0], b=vIdx+f[1], c=vIdx+f[2], d=vIdx+f[3]
      faceLines+=`f ${a} ${b} ${c} ${d}\n`
    })
    vIdx+=8
  })
  obj+=faceLines
  return obj
}

export function exportSTLASCII(voxels, name='model') {
  let stl = `solid ${name}\n`
  function addFacet(v1,v2,v3){
    // compute normal
    const ux=v2[0]-v1[0], uy=v2[1]-v1[1], uz=v2[2]-v1[2]
    const vx=v3[0]-v1[0], vy=v3[1]-v1[1], vz=v3[2]-v1[2]
    let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx
    const len=Math.hypot(nx,ny,nz)||1; nx/=len; ny/=len; nz/=len
    stl+=`  facet normal ${nx} ${ny} ${nz}\n    outer loop\n      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n      vertex ${v3[0]} ${v3[1]} ${v3[2]}\n    endloop\n  endfacet\n`
  }
  voxels.forEach(vox=>{
    const v=cubeVertices(vox.x, vox.y, vox.z)
    // each quad -> 2 triangles
    FACES.forEach(f=>{
      const p0=v[f[0]], p1=v[f[1]], p2=v[f[2]], p3=v[f[3]]
      addFacet(p0,p1,p2)
      addFacet(p0,p2,p3)
    })
  })
  stl+=`endsolid ${name}\n`
  return stl
}

export function downloadText(content, filename, mime='text/plain'){
  const blob = new Blob([content], {type:mime})
  const url = URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url; a.download=filename; a.click()
  setTimeout(()=>URL.revokeObjectURL(url), 2000)
}
