import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Environment, PerspectiveCamera, OrthographicCamera } from '@react-three/drei'

const COL = new THREE.Color()
const COL2 = new THREE.Color()
const TOP_UP = new THREE.Vector3(0, 0, -1)
const FOCUS = new THREE.Vector3()
const TOP_FOV = 16 // near-orthographic from above, so the code stays square
const ISO_FOV = 38
const ISO_FILL = 1.42 // a square plate seen down its diagonal is ~sqrt(2) wide
const ASSEMBLE_SECONDS = 1.1
const GOLD = new THREE.Color('#FACC15')

const damp = (dt, lambda) => 1 - Math.exp(-lambda * dt)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (p) => p * p * (3 - 2 * p)

/**
 * Vertical choreography only. Voxels never yaw on their own axis — that scrambled
 * the code so it only read from one angle. Whole-model rotation lives on the group.
 */
function idlePose(mode, t, delay) {
  switch (mode) {
    case 'float': return { dy: Math.sin(t * 1.2 + delay) * 0.25, s: 1 }
    case 'bounce': {
      const b = Math.abs(Math.sin(t * 2.2 + delay * 0.7))
      return { dy: b * 0.6, s: 1 + b * 0.08 }
    }
    case 'wave': return { dy: Math.sin(t * 3 - delay * 0.4) * 0.4, s: 1 }
    case 'spin': return { dy: Math.sin(t * 2 + delay) * 0.12, s: 1 }
    default: return { dy: 0, s: 1 } // assemble settles dead still
  }
}

/** Write a scale+translation matrix straight into the instance buffer. */
function writeInstance(arr, i, x, y, z, s) {
  const o = i * 16
  arr[o] = s; arr[o + 1] = 0; arr[o + 2] = 0; arr[o + 3] = 0
  arr[o + 4] = 0; arr[o + 5] = s; arr[o + 6] = 0; arr[o + 7] = 0
  arr[o + 8] = 0; arr[o + 9] = 0; arr[o + 10] = s; arr[o + 11] = 0
  arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1
}

/** Shared assemble/burst clock, restarted whenever the model or the tick changes. */
function useBeat(animateTick, cells) {
  const startRef = useRef(0)
  const pending = useRef(true)
  useEffect(() => { pending.current = true }, [animateTick, cells])
  return (t) => {
    if (pending.current) { startRef.current = t; pending.current = false }
    return t - startRef.current
  }
}

/**
 * The QR plate: base slab, dark module caps and any support columns, all as one
 * InstancedMesh. A 105-module code is 12,000+ boxes; individual meshes are not an
 * option. Cubes are full 1.0 so the plate is a seamless solid, exactly as exported.
 */
function PlateField({ cells, colors, goldenIndex, animMode, animateTick, revealRef }) {
  const ref = useRef()
  const beat = useBeat(animateTick, cells)
  const lastGold = useRef(-1)

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < cells.length; i++) { COL.set(colors[i]); mesh.setColorAt(i, COL) }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    lastGold.current = -1
  }, [cells, colors])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    const age = beat(t)
    const assembling = animMode === 'assemble'
    const burstP = !assembling && age < 1.6 ? 1 - age / 1.6 : 0
    const calm = 1 - revealRef.current
    const arr = mesh.instanceMatrix.array

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      let dy = 0
      let s = 1
      if (assembling) {
        const p = smooth(clamp01((age - c.delay * 0.05) / ASSEMBLE_SECONDS))
        dy = (1 - p) * 9
        s = 0.15 + 0.85 * p
      } else {
        const pose = idlePose(animMode, t, c.delay)
        dy = pose.dy * calm
        s = 1 + (pose.s - 1) * calm
        if (burstP > 0) {
          const w = c.delay * 0.6
          dy += (Math.sin(t * 8 + w) * 0.5 + Math.abs(Math.sin(t * 12 + w)) * 0.3) * burstP * calm
        }
      }
      writeInstance(arr, i, c.x, c.y + dy, c.z, s)
    }
    mesh.instanceMatrix.needsUpdate = true

    // The portal tile glows gold in the diorama and fades to its true module
    // colour on the way up, so the code that actually scans is never contaminated.
    if (goldenIndex != null && mesh.instanceColor) {
      const g = Math.round(calm * 100)
      if (g !== lastGold.current) {
        lastGold.current = g
        COL.set(colors[goldenIndex]).lerp(GOLD, calm)
        mesh.setColorAt(goldenIndex, COL)
        mesh.instanceColor.needsUpdate = true
      }
    }
  })

  if (!cells.length) return null
  return (
    <instancedMesh key={cells.length} ref={ref} args={[null, null, cells.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.72} metalness={0.06} />
    </instancedMesh>
  )
}

/**
 * The avatar. On reveal each voxel drops onto the module it stands over and takes
 * that module's colour, so from directly above it has become part of the code.
 */
function AvatarField({ cells, rest, sunk, animMode, animateTick, revealRef }) {
  const ref = useRef()
  const beat = useBeat(animateTick, cells)
  const lastSink = useRef(-1)

  const restCol = useMemo(() => rest.map((c) => new THREE.Color(c)), [rest])
  const sunkCol = useMemo(() => sunk.map((c) => new THREE.Color(c)), [sunk])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < cells.length; i++) mesh.setColorAt(i, restCol[i])
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    lastSink.current = -1
  }, [cells, restCol])

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    const age = beat(t)
    const assembling = animMode === 'assemble'
    const burstP = !assembling && age < 1.6 ? 1 - age / 1.6 : 0
    const r = revealRef.current
    const arr = mesh.instanceMatrix.array

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      // taller voxels have further to fall, so they leave first and land together
      const lead = (1 - c.heightRank) * 0.35
      const sink = smooth(clamp01((r - lead) / 0.65))
      const calm = 1 - sink
      // a hair proud of the tile, monotonic in i so co-located voxels never z-fight
      let y = THREE.MathUtils.lerp(c.y, c.sinkY + 0.08 + i * 0.0006, sink)
      let s = 1
      if (assembling && sink < 0.01) {
        const p = smooth(clamp01((age - 0.25 - c.heightRank * 0.35) / ASSEMBLE_SECONDS))
        y += (1 - p) * 11
        s = 0.15 + 0.85 * p
      } else {
        const pose = idlePose(animMode, t, c.delay)
        y += pose.dy * calm
        s = 1 + (pose.s - 1) * calm
        if (burstP > 0) {
          const w = c.delay * 0.6
          y += (Math.sin(t * 8 + w) * 0.5 + Math.abs(Math.sin(t * 12 + w)) * 0.3) * burstP * calm
        }
      }
      writeInstance(arr, i, c.x, y, c.z, s)
    }
    mesh.instanceMatrix.needsUpdate = true

    const q = Math.round(r * 120)
    if (q !== lastSink.current && mesh.instanceColor) {
      lastSink.current = q
      for (let i = 0; i < cells.length; i++) {
        const lead = (1 - cells[i].heightRank) * 0.35
        const sink = smooth(clamp01((r - lead) / 0.65))
        COL2.copy(restCol[i]).lerp(sunkCol[i], sink)
        mesh.setColorAt(i, COL2)
      }
      mesh.instanceColor.needsUpdate = true
    }
  })

  if (!cells.length) return null
  return (
    <instancedMesh key={cells.length} ref={ref} args={[null, null, cells.length]} castShadow receiveShadow frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.72} metalness={0.06} />
    </instancedMesh>
  )
}

function Diorama(props) {
  const { animMode, autoSpin, animateTick, revealRef } = props
  const groupRef = useRef()
  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    if (revealRef.current > 0.001) {
      // unwind to the nearest square-on turn — a rotated code is a harder scan
      const turns = Math.round(g.rotation.y / (Math.PI * 2)) * Math.PI * 2
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, turns, damp(dt, 4))
    } else if (autoSpin || animMode === 'spin') {
      g.rotation.y += dt * 0.35
    }
  })
  return (
    <group ref={groupRef}>
      <PlateField
        cells={props.plateCells} colors={props.plateColors} goldenIndex={props.goldenIndex}
        animMode={animMode} animateTick={animateTick} revealRef={revealRef}
      />
      <AvatarField
        cells={props.avatarCells} rest={props.avatarRest} sunk={props.avatarSunk}
        animMode={animMode} animateTick={animateTick} revealRef={revealRef}
      />
    </group>
  )
}

/** Lighting: relief side-on, flat albedo from the zenith so the code binarises. */
function SceneLights({ revealRef, span }) {
  const keyRef = useRef()
  const ambRef = useRef()
  const fillRef = useRef()
  const warmRef = useRef()
  const reach = span * 0.8

  useFrame((state) => {
    const k = revealRef.current
    const L = (a, b) => THREE.MathUtils.lerp(a, b, k)
    if (ambRef.current) ambRef.current.intensity = L(0.9, 0.42)
    if (keyRef.current) {
      keyRef.current.position.set(L(span * 0.4, span * 0.02), L(span * 0.7, span * 1.4), L(span * 0.3, span * 0.02))
      keyRef.current.intensity = L(1.2, 0.42)
    }
    if (fillRef.current) fillRef.current.intensity = L(0.6, 0.08)
    if (warmRef.current) warmRef.current.intensity = L(0.8, 0)
    state.scene.environmentIntensity = L(1, 0.12)
  })

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.9} />
      <directionalLight
        ref={keyRef}
        position={[span * 0.4, span * 0.7, span * 0.3]}
        intensity={1.2}
        castShadow
        shadow-mapSize={2048}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-far={span * 4}
      />
      <directionalLight ref={fillRef} position={[-6, 8, -4]} intensity={0.6} />
      <pointLight ref={warmRef} position={[0, 10, 0]} intensity={0.8} color="#ffd06b" />
    </>
  )
}

/**
 * Owns the 2D <-> 3D flight. Holds the 0..1 progress every voxel reads, and frames
 * the whole plate on load, on resize, on code-size change and on demand.
 */
function CameraRig({ revealed, revealRef, span, center, projection, fitTick, controlsRef }) {
  const home = useRef({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0), fov: ISO_FOV, zoom: 20 })
  const wasRevealed = useRef(false)
  const framed = useRef('')
  const look = useMemo(() => new THREE.Matrix4(), [])
  const topQuat = useMemo(() => new THREE.Quaternion(), [])
  const topPos = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const camera = state.camera
    const size = state.size
    const aspect = size.width / Math.max(1, size.height)
    const widen = aspect < 1 ? 1 / aspect : 1
    const isoDist = ((span * ISO_FILL) / 2 / Math.tan((ISO_FOV * Math.PI) / 360)) * widen

    // Fit the whole plate: first frame, resize, new code size, projection swap,
    // and whenever Fit is pressed.
    const stamp = `${span}:${center.x},${center.z}:${projection}:${fitTick}:${size.width}x${size.height}`
    if (framed.current !== stamp && !revealed) {
      framed.current = stamp
      const u = 1 / Math.sqrt(0.55 * 0.55 + 0.7 * 0.7 + 0.55 * 0.55)
      camera.position.set(center.x + isoDist * 0.55 * u, isoDist * 0.7 * u, center.z + isoDist * 0.55 * u)
      camera.up.set(0, 1, 0)
      if (camera.isOrthographicCamera) {
        camera.zoom = Math.min(size.width, size.height) / (span * ISO_FILL)
        camera.updateProjectionMatrix()
      }
      if (controlsRef.current) {
        controlsRef.current.target.set(center.x, 1, center.z)
        controlsRef.current.update()
      }
    }

    if (revealed && !wasRevealed.current) {
      home.current.pos.copy(camera.position)
      home.current.quat.copy(camera.quaternion)
      home.current.up.copy(camera.up)
      home.current.fov = camera.isPerspectiveCamera ? camera.fov : ISO_FOV
      home.current.zoom = camera.zoom
      if (controlsRef.current) controlsRef.current.enabled = false
    }
    wasRevealed.current = revealed

    const target = revealed ? 1 : 0
    const next = THREE.MathUtils.lerp(revealRef.current, target, damp(dt, 3.2))
    revealRef.current = Math.abs(target - next) < 0.0015 ? target : next
    const k = revealRef.current

    if (k <= 0.0001) {
      if (controlsRef.current && !controlsRef.current.enabled) {
        camera.position.copy(home.current.pos)
        camera.quaternion.copy(home.current.quat)
        camera.up.copy(home.current.up)
        if (camera.isPerspectiveCamera) camera.fov = home.current.fov
        else camera.zoom = home.current.zoom
        camera.updateProjectionMatrix()
        controlsRef.current.enabled = true
        controlsRef.current.update()
      }
      return
    }

    const dist = (span / 2 / Math.tan((TOP_FOV * Math.PI) / 360)) * widen
    // the label band hangs below the code, so frame the model's box, not the origin
    topPos.set(center.x, dist, center.z)
    FOCUS.set(center.x, 0, center.z)
    // Matrix4.lookAt uses the camera convention (-Z toward the target);
    // Object3D.lookAt does not for non-cameras and would aim at the sky.
    look.lookAt(topPos, FOCUS, TOP_UP)
    topQuat.setFromRotationMatrix(look)

    // pose is a pure function of k, so the descent retraces the climb exactly
    const e = smooth(k)
    camera.position.lerpVectors(home.current.pos, topPos, e)
    camera.quaternion.slerpQuaternions(home.current.quat, topQuat, e)
    camera.up.lerpVectors(home.current.up, TOP_UP, e).normalize()
    if (camera.isPerspectiveCamera) camera.fov = THREE.MathUtils.lerp(home.current.fov, TOP_FOV, e)
    else camera.zoom = THREE.MathUtils.lerp(home.current.zoom, Math.min(size.width, size.height) / span, e)
    camera.updateProjectionMatrix()
  })

  return null
}

export default function VoxelScene({
  plateCells = [],
  plateColors = [],
  avatarCells = [],
  avatarRest = [],
  avatarSunk = [],
  goldenIndex = null,
  span = 24,
  center = { x: 0, z: 0 },
  projection = 'perspective',
  autoSpin = false,
  animMode = 'assemble',
  animateTick = 0,
  fitTick = 0,
  revealed = false,
  onTap,
}) {
  const controlsRef = useRef()
  const revealRef = useRef(0)
  const tapRef = useRef(null)
  const far = span * 60

  const onPointerDown = (e) => { tapRef.current = { x: e.clientX, y: e.clientY, t: performance.now() } }
  const onPointerUp = (e) => {
    const d = tapRef.current
    tapRef.current = null
    if (!d || !onTap) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return
    if (performance.now() - d.t > 400) return
    onTap()
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }}>
        {projection === 'isometric'
          ? <OrthographicCamera makeDefault position={[span, span, span]} zoom={20} near={-far} far={far} />
          : <PerspectiveCamera makeDefault position={[span, span, span]} fov={ISO_FOV} near={0.3} far={far} />}
        <CameraRig revealed={revealed} revealRef={revealRef} span={span} center={center} projection={projection} fitTick={fitTick} controlsRef={controlsRef} />
        <SceneLights revealRef={revealRef} span={span} />
        <Diorama
          plateCells={plateCells}
          plateColors={plateColors}
          goldenIndex={goldenIndex}
          avatarCells={avatarCells}
          avatarRest={avatarRest}
          avatarSunk={avatarSunk}
          animMode={animMode}
          autoSpin={autoSpin}
          animateTick={animateTick}
          revealRef={revealRef}
        />
        <ContactShadows position={[center.x, -0.52, center.z]} opacity={0.38} scale={span * 1.8} blur={2.6} far={8} />
        <Environment preset="city" />
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          minDistance={0.6}
          maxDistance={span * 14}
          zoomSpeed={1.15}
          target={[center.x, 1, center.z]}
          autoRotate={false}
        />
      </Canvas>

      <div className="scene-help" style={{ opacity: revealed ? 0 : 1 }}>
        <b>Drag</b> orbit &nbsp; <b>Scroll</b> zoom &nbsp; <b>Shift+drag</b> pan &nbsp; <b>Tap</b> 2D / 3D
      </div>
    </div>
  )
}
