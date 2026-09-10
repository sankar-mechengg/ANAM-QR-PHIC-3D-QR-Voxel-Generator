import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Environment, PerspectiveCamera, OrthographicCamera } from '@react-three/drei'

function Voxel({ position, color, delay, animMode, animateTick }) {
  const ref = useRef()
  const initialY = position[1]
  const burstRef = useRef(0) // time of last animate click
  const lastTick = useRef(animateTick)

  useEffect(()=>{
    if(animateTick !== lastTick.current){
      burstRef.current = performance.now() / 1000
      lastTick.current = animateTick
    }
  }, [animateTick])

  useFrame((state)=>{
    if(!ref.current) return
    const t = state.clock.elapsedTime
    const burstAge = t - burstRef.current
    const isBurst = burstAge >=0 && burstAge < 1.8
    // burst overrides: energetic dance
    if(isBurst){
      const p = 1 - burstAge/1.8
      const w = delay * 0.6
      ref.current.position.y = initialY + Math.sin(t*8 + w)*0.6 * p + Math.abs(Math.sin(t*12 + w))*0.35 * p
      ref.current.rotation.y = t*3 + delay + Math.sin(t*10 + w)*0.8 * p
      ref.current.rotation.z = Math.sin(t*9 + delay)*0.35 * p
      ref.current.rotation.x = Math.cos(t*7 + delay)*0.2 * p
      ref.current.scale.setScalar(1 + Math.sin(t*14 + delay)*0.12 * p + 0.06*p)
      return
    }
    // normal modes
    if(animMode==='float'){
      ref.current.position.y = initialY + Math.sin(t*1.2 + delay)*0.25
      ref.current.rotation.y += 0.005
      ref.current.rotation.z *= 0.98
      ref.current.scale.setScalar(1)
    } else if(animMode==='spin'){
      ref.current.rotation.y = t*1.2 + delay
      ref.current.position.y = initialY + Math.sin(t*2 + delay)*0.15
    } else if(animMode==='bounce'){
      const b = Math.abs(Math.sin(t*2.2 + delay*0.7))
      ref.current.position.y = initialY + b*0.6
      ref.current.scale.setScalar(1 + b*0.08)
    } else if(animMode==='wave'){
      ref.current.position.y = initialY + Math.sin(t*3 - delay*0.4)*0.4
      ref.current.rotation.z = Math.sin(t*2 + delay*0.5)*0.15
    } else if(animMode==='assemble'){
      ref.current.position.y = initialY + Math.sin(t*1 + delay*0.2)*0.1
      ref.current.scale.setScalar(1)
    } else {
      ref.current.position.y = initialY + Math.sin(t*0.8 + delay)*0.12
      ref.current.scale.setScalar(1)
    }
  })
  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <boxGeometry args={[0.9,0.9,0.9]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
    </mesh>
  )
}

function VoxelGroup({ voxels, animMode, autoSpin, animateTick }) {
  const groupRef = useRef()
  useFrame((_, delta)=>{
    if(autoSpin && groupRef.current){
      groupRef.current.rotation.y += delta * 0.4
    }
  })
  return (
    <group ref={groupRef}>
      {voxels.map((v,i)=>(
        <Voxel key={i} position={[v.x, v.y, v.z]} color={v.color} delay={i % 12} animMode={animMode} animateTick={animateTick} />
      ))}
    </group>
  )
}

function BasePlate({ size }){
  const s = size
  return (
    <mesh position={[0,-0.6,0]} receiveShadow>
      <boxGeometry args={[s+1.5, 0.3, s+1.5]} />
      <meshStandardMaterial color="#1f2330" roughness={0.9} />
    </mesh>
  )
}

export default function VoxelScene({
  voxels,
  qrSize,
  projection='perspective',
  autoSpin=false,
  animMode='float',
  animateTick=0,
  showBase=true,
}){
  const controlsRef = useRef()
  const canvasWrapRef = useRef()

  return (
    <div ref={canvasWrapRef} style={{width:'100%', height:'100%', position:'relative'}}>
      <Canvas shadows dpr={[1,2]} gl={{preserveDrawingBuffer:true, antialias:true}} camera={{position: qrSize>25 ? [18,18,18] : [12,12,12], fov:45}}>
        {projection==='isometric' && (
          <OrthographicCamera makeDefault position={[14,14,14]} zoom={28} />
        )}
        {projection==='perspective' && (
          <PerspectiveCamera makeDefault position={[12,14,12]} fov={38} />
        )}
        <ambientLight intensity={0.9} />
        <directionalLight position={[8,14,6]} intensity={1.2} castShadow shadow-mapSize={2048} />
        <directionalLight position={[-6,8,-4]} intensity={0.6} />
        <pointLight position={[0,10,0]} intensity={0.8} color="#ffd06b" />
        <VoxelGroup voxels={voxels} animMode={animMode} autoSpin={autoSpin} animateTick={animateTick} />
        {showBase && <BasePlate size={qrSize} />}
        <ContactShadows position={[0,-0.5,0]} opacity={0.45} scale={qrSize*2.2} blur={2.5} far={6} />
        <Environment preset="city" />
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          minDistance={4}
          maxDistance={60}
          target={[0,1,0]}
          autoRotate={false}
        />
        <gridHelper args={[qrSize*2.5, 20, '#2a2f45', '#1a1f33']} position={[0,-0.75,0]} />
      </Canvas>

      <div style={{position:'absolute', left:12, bottom:12, background:'rgba(15,18,30,0.7)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.08)', padding:'8px 10px', borderRadius:10, fontSize:12, color:'#cbd5e1', lineHeight:1.4}}>
        <b style={{color:'#fff'}}>Orbit:</b> drag to rotate &nbsp; <b style={{color:'#fff'}}>Scroll:</b> zoom &nbsp; <b style={{color:'#fff'}}>Shift+drag:</b> pan
      </div>
    </div>
  )
}
