import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import VoxelScene from './components/VoxelScene.jsx'
import { CHARACTERS, generateQRBaseVoxels } from './data/characters.js'
import { exportOBJ, exportSTLASCII, downloadText } from './utils/exporters.js'
import { LEGAL_DOCS, LEGAL_LINKS } from './data/legal.js'

const PALETTES = {
  classic: () => '#0b0f1e',
  neon: (x,y)=> `hsl(${(180 + x*8 + y*5)%360} 90% 55%)`,
  sunset: (x,y)=> `hsl(${(12 + x*4 - y*2 + 360)%360} 92% 58%)`,
  ocean: (x,y)=> `hsl(${(200 + x*3 + y*7)%360} 85% 60%)`,
  monochrome: () => '#111827',
}

function LegalModal({ docId, onClose }){
  const doc = docId ? LEGAL_DOCS[docId] : null
  if(!docId || !doc) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{doc.title}</h2>
            <p>Last updated: {doc.updated} • QR Voxel Studio Pvt. Ltd.</p>
          </div>
          <button className="btn btn-small" onClick={onClose}>✕ Close</button>
        </div>
        <div className="modal-body">
          {doc.content.split('\n').map((line,i)=>{
            if(line.startsWith('**') && line.endsWith('**')){
              return <h3 key={i}>{line.replace(/\*\*/g,'')}</h3>
            }
            if(line.startsWith('|')) return null
            if(line.trim().startsWith('-') || line.trim().startsWith('•')){
              return <li key={i} style={{marginLeft:18, color:'#cbd5e1'}}>{line.replace(/^[\-•]\s*/,'')}</li>
            }
            if(line.trim()==='') return <br key={i}/>
            // bold inline
            const parts = line.split(/(\*\*.*?\*\*)/)
            return <p key={i}>{parts.map((p,j)=> p.startsWith('**') ? <b key={j} style={{color:'#fff'}}>{p.replace(/\*\*/g,'')}</b> : p)}</p>
          })}
        </div>
        <div className="modal-foot">
          <span>Questions? legal@qr-voxel.studio • privacy@qr-voxel.studio</span>
          <button className="btn btn-primary btn-small" onClick={onClose}>I understand</button>
        </div>
      </div>
    </div>
  )
}

function CookieBanner({ onManage }){
  const [visible, setVisible] = useState(()=>{
    try{ return localStorage.getItem('qv_consent')===null }catch{ return true }
  })
  if(!visible) return null
  const decide = (v)=>{
    try{ localStorage.setItem('qv_consent', v) }catch{}
    setVisible(false)
  }
  return (
    <div className="cookie-banner">
      <div className="cookie-text">
        <b>We value your privacy</b>
        <span> We use essential cookies to run the studio and, with your consent, preference & anonymized analytics cookies. Manage your choices anytime via the Consent Centre. <a onClick={onManage} style={{color:'#facc15', cursor:'pointer', textDecoration:'underline'}}>Learn more</a>.</span>
      </div>
      <div className="cookie-actions">
        <button className="btn btn-small btn-ghost" onClick={()=> decide('reject')}>Reject non-essential</button>
        <button className="btn btn-small" onClick={onManage}>Customise</button>
        <button className="btn btn-small btn-primary" onClick={()=> decide('accept')}>Accept all</button>
      </div>
    </div>
  )
}

export default function App(){
  const [input, setInput] = useState('https://example.com  —  hello 3D QR!')
  const [matrix, setMatrix] = useState(null)
  const [size, setSize] = useState(0)
  const [hue, setHue] = useState(0)
  const [palette, setPalette] = useState('classic')
  const [is3D, setIs3D] = useState(false)
  const [selectedId, setSelectedId] = useState('robot')
  const [goldenId, setGoldenId] = useState(null)
  const [flipTick, setFlipTick] = useState(0)
  const [showQRBase, setShowQRBase] = useState(true)
  const [projection, setProjection] = useState('perspective')
  const [autoSpin, setAutoSpin] = useState(true)
  const [animMode, setAnimMode] = useState('float')
  const [animateTick, setAnimateTick] = useState(0)
  const [tilt, setTilt] = useState(0)
  const [legalDoc, setLegalDoc] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const containerRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(()=>{
    try{
      const qr = QRCode.create(input || ' ', { errorCorrectionLevel: 'H' })
      const n = qr.modules.size
      const m = []
      for(let y=0;y<n;y++){
        const row=[]
        for(let x=0;x<n;x++) row.push(qr.modules.get(x,y) === 1)
        m.push(row)
      }
      setMatrix(m); setSize(n)
      const darks=[]
      m.forEach((row,y)=> row.forEach((v,x)=>{ if(v) darks.push(y*n+x)}))
      if(darks.length) setGoldenId(darks[Math.floor(Math.random()*darks.length)])
      else setGoldenId(null)
    }catch(e){ console.error(e) }
  },[input])

  useEffect(()=>{
    const el = containerRef.current
    if(!el || is3D) return
    const onWheel = (e)=>{
      e.preventDefault()
      const delta = Math.sign(e.deltaY) * 6
      setHue(h=> (h + delta + 360)%360)
      setTilt(t=> Math.max(-12, Math.min(12, t + Math.sign(e.deltaY)*0.6)) )
      setFlipTick(k=>k+1)
      setTimeout(()=> setTilt(0), 400)
    }
    el.addEventListener('wheel', onWheel, {passive:false})
    return ()=> el.removeEventListener('wheel', onWheel)
  },[is3D])

  const selectedChar = useMemo(()=> CHARACTERS.find(c=>c.id===selectedId) || CHARACTERS[0], [selectedId])

  const voxels = useMemo(()=>{
    if(!matrix) return []
    const charVox = selectedChar.voxels
    const shiftedChar = charVox.map(v=> ({...v, y: v.y + 1.5 + (showQRBase?1:0)}))
    if(!showQRBase) return shiftedChar
    const palFn = (x,y,isDark)=>{
      if(!isDark) return '#ffffff'
      if(palette==='classic') return '#0b0f1e'
      if(palette==='monochrome') return '#0f172a'
      const baseHue = palette==='neon' ? (180) : palette==='sunset' ? 14 : 205
      const h = (baseHue + hue + x*3 + y*2)%360
      return `hsl(${h} 90% 58%)`
    }
    const qrVox = generateQRBaseVoxels(matrix, palFn)
    return [...qrVox, ...shiftedChar]
  },[matrix, selectedChar, showQRBase, palette, hue])

  const takeSnapshot = ()=>{
    const canvas = document.querySelector('canvas')
    if(!canvas){ alert('Canvas not ready'); return }
    const url = canvas.toDataURL('image/png')
    const a=document.createElement('a')
    a.href=url; a.download=`qr-3d-${selectedId}-${Date.now()}.png`; a.click()
  }

  const handleOBJ = ()=>{
    const content = exportOBJ(voxels, `qr_${selectedId}`)
    downloadText(content, `qr-3d-${selectedId}.obj`, 'text/plain')
  }
  const handleSTL = ()=>{
    const content = exportSTLASCII(voxels, `qr_${selectedId}`)
    downloadText(content, `qr-3d-${selectedId}.stl`, 'application/sla')
  }

  const randomizeGolden = ()=>{
    if(!matrix) return
    setIs3D(false)
    setTimeout(()=>{
      const darks=[]
      matrix.forEach((row,y)=> row.forEach((v,x)=>{ if(v) darks.push(y*size+x)}))
      if(darks.length){
        let next = darks[Math.floor(Math.random()*darks.length)]
        if(next===goldenId && darks.length>1) next = darks[(darks.indexOf(next)+1)%darks.length]
        setGoldenId(next)
      }
      setHue(Math.floor(Math.random()*360))
      setFlipTick(k=>k+1)
    }, 50)
  }

  const switchTo3D = (random=false)=>{
    if(random){
      const r = CHARACTERS[Math.floor(Math.random()*CHARACTERS.length)]
      setSelectedId(r.id)
    }
    setIs3D(true)
    setAnimMode('assemble')
    setTimeout(()=> setAnimMode('float'), 1400)
    setTimeout(()=> setAnimateTick(k=>k+1), 200)
  }

  const triggerAnimate = ()=>{
    if(!is3D){ switchTo3D(); return }
    // burst animate
    setAnimateTick(k=>k+1)
    // also cycle through modes for visual fun
    const modes=['bounce','spin','wave','float']
    const next = modes[Math.floor(Math.random()*modes.length)]
    setAnimMode(next)
    setAutoSpin(true)
  }

  const startRecording = async ()=>{
    const canvas = document.querySelector('canvas')
    if(!canvas){ alert('3D canvas not ready — enter 3D mode first.'); return }
    const stream = canvas.captureStream(60)
    // try vp9 then vp8
    let options = {mimeType:'video/webm;codecs=vp9'}
    if(!MediaRecorder.isTypeSupported(options.mimeType)){
      options={mimeType:'video/webm;codecs=vp8'}
      if(!MediaRecorder.isTypeSupported(options.mimeType)) options={mimeType:'video/webm'}
    }
    const rec = new MediaRecorder(stream, options)
    chunksRef.current=[]
    rec.ondataavailable = e=>{ if(e.data.size>0) chunksRef.current.push(e.data)}
    rec.onstop = ()=>{
      const blob = new Blob(chunksRef.current, {type: rec.mimeType || 'video/webm'})
      const url = URL.createObjectURL(blob)
      const a=document.createElement('a')
      a.href=url; a.download=`qr-voxel-${selectedId}-${Date.now()}.webm`; a.click()
      setTimeout(()=> URL.revokeObjectURL(url), 4000)
      stream.getTracks().forEach(t=> t.stop())
    }
    rec.start(100)
    recorderRef.current=rec
    setIsRecording(true)
    setRecTime(0)
    timerRef.current = setInterval(()=> setRecTime(t=> t+1), 1000)
    // auto-animate while recording
    setAnimateTick(k=>k+1)
    setAnimMode('bounce')
  }
  const stopRecording = ()=>{
    if(recorderRef.current && recorderRef.current.state!=='inactive'){
      recorderRef.current.stop()
    }
    setIsRecording(false)
    clearInterval(timerRef.current)
    setRecTime(0)
    setAnimMode('float')
  }

  const openImmersive = ()=>{
    const w = window.open('', '_blank', 'width=980,height=780')
    if(!w){ alert('Pop-up blocked — allow pop-ups.'); return }
    w.document.write(`<!doctype html><html><head><title>Immersive QR — ${input}</title><style>body{margin:0;display:grid;place-items:center;height:100vh;background:#0a0b10;color:#e2e8f0;font-family:system-ui} a{color:#facc15}</style></head><body><h1 style="text-align:center;max-width:700px;padding:24px">Immersive QR preview<br><small style="color:#94a3b8">${input.replace(/</g,'&lt;')}</small></h1><p>Close this window and return to the main app — your 3D model is ready to export.</p><p><a href="#" onclick="window.close()">Close</a></p></body></html>`)
    w.document.close()
  }

  const fmtTime = (s)=> `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-badge">◈</div>
          <span>QR VOXEL STUDIO</span><small>Cinematic • Interactive • Printable</small>
        </div>
        <div className="top-actions">
          <div className="pill"><span>●</span> Vite + React + Three.js</div>
          <button className="btn btn-ghost btn-small" onClick={openImmersive}>⧉ Pop-out window</button>
          <button className="btn btn-primary" onClick={()=> switchTo3D(true)}>🎲 Randomize 3D</button>
        </div>
      </header>

      <div className="main">
        <aside className="left">
          <div className="panel-title">1 — Your link</div>
          <div className="input-wrap">
            <span className="input-icon">🔗</span>
            <input className="input" value={input} onChange={e=> setInput(e.target.value)} placeholder="https://your-link.com" />
          </div>
          <div className="hint">Type any URL, text or emoji. QR ECC = High (30% redundancy). Scroll on the QR to morph colours.</div>

          <div className="panel-title">Palette & Scroll FX</div>
          <div className="segmented">
            {Object.keys(PALETTES).map(k=>(
              <button key={k} className={`seg-btn ${palette===k?'active':''}`} onClick={()=> setPalette(k)}>{k}</button>
            ))}
          </div>
          <div className="slider-row">
            <span style={{fontSize:12, color:'#94a3b8'}}>Hue</span>
            <input className="slider" type="range" min={0} max={360} value={hue} onChange={e=> setHue(+e.target.value)} />
            <span style={{fontSize:12, fontWeight:700, color:'#facc15'}}>{hue}°</span>
          </div>
          <div className="hint">Scroll wheel over the 2D QR for cinematic tile-flip + hue shift. Classic keeps QR scannable.</div>

          <div className="panel-title">Golden portal tile</div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-small" onClick={randomizeGolden}>✨ Re-roll golden tile</button>
            <button className="btn btn-small btn-primary" onClick={()=> switchTo3D(false)} disabled={!is3D && goldenId===null}>◈ Enter 3D</button>
          </div>
          <div className="hint">The shimmering gold tile is your portal. Click it to morph the entire QR into a voxel character.</div>

          <div className="panel-title">Export & Snapshot</div>
          <div className="toolbar">
            <button className="btn" onClick={takeSnapshot}>📸 Snapshot PNG</button>
            <button className="btn" onClick={handleOBJ}>⬢ Export OBJ</button>
            <button className="btn" onClick={handleSTL}>⬣ Export STL</button>
          </div>
          <div className="toolbar" style={{marginTop:8}}>
            {!isRecording ? (
              <button className="btn btn-primary" onClick={startRecording} title="Record canvas to WebM (60 fps)">● Record Video</button>
            ) : (
              <button className="btn" onClick={stopRecording} style={{background:'#dc2626', color:'#fff', borderColor:'#ef4444'}}>■ Stop ({fmtTime(recTime)})</button>
            )}
            <button className="btn" onClick={triggerAnimate} style={{flex:1}}>✨ Animate</button>
          </div>
          <div className="hint">PNG = canvas grab. OBJ (colour) → Blender. STL (solid) → slicer. <b style={{color:'#facc15'}}>Record Video</b> captures the 3D canvas at 60fps to WebM — Animate first for a dancing clip!</div>

          <div style={{marginTop:16, display:'flex', gap:8}}>
            <div className="stat"><b>{size}×{size}</b><small>modules</small></div>
            <div className="stat"><b>{voxels.length}</b><small>voxels</small></div>
            {isRecording && <div className="stat" style={{background:'#450a0a', borderColor:'#7f1d1d', color:'#fecaca'}}><b>● REC</b><small>{fmtTime(recTime)}</small></div>}
          </div>
        </aside>

        <section className="stage">
          <div className="stage-header">
            <div className="stage-title">
              {is3D ? `3D VOXEL — ${selectedChar.name}` : '2D INTERACTIVE QR'}
              <span className="badge">{is3D ? `${projection} • ${animMode}` : `scroll to animate • hue ${hue}°`}</span>
            </div>
            <div className="stage-controls">
              {!is3D ? (
                <>
                  <button className="btn btn-small" onClick={()=> setFlipTick(k=>k+1)}>↻ Flip tiles</button>
                  <button className="btn btn-small btn-primary" onClick={()=> switchTo3D()}>Go 3D →</button>
                </>
              ) : (
                <>
                  <button className="btn btn-small" onClick={()=> setIs3D(false)}>← Back to 2D</button>
                  <button className="btn btn-small btn-primary" onClick={triggerAnimate}>✨ Animate</button>
                  {!isRecording ? (
                    <button className="btn btn-small" onClick={startRecording} style={{background:'#fff', color:'#111'}}>● Rec</button>
                  ) : (
                    <button className="btn btn-small" onClick={stopRecording} style={{background:'#ef4444', color:'#fff'}}>■ {fmtTime(recTime)}</button>
                  )}
                  <button className={`btn btn-small ${projection==='isometric'?'btn-primary':''}`} onClick={()=> setProjection(p=> p==='perspective'?'isometric':'perspective')}>Isometric</button>
                  <button className={`btn btn-small ${autoSpin?'btn-primary':''}`} onClick={()=> setAutoSpin(v=>!v)}>{autoSpin?'◐ Spin on':'○ Spin off'}</button>
                </>
              )}
            </div>
          </div>

          <div className="viewport">
            {!is3D ? (
              <div
                ref={containerRef}
                className="qr-wrap"
                style={{transform:`perspective(900px) rotateX(${tilt*0.6}deg) rotateY(${tilt*0.4}deg)`, transition:'transform 300ms'}}
                title="Scroll to change colours • Click golden tile to go 3D"
              >
                <div className="color-orb" style={{background: palette==='classic' ? 'radial-gradient(circle, rgba(250,204,21,0.9), transparent 70%)' : `radial-gradient(circle, hsl(${hue} 90% 60%), transparent 70%)`, left:'18%', top:'18%'}} />
                <div className="color-orb" style={{background: `radial-gradient(circle, hsl(${(hue+90)%360} 90% 60%), transparent 70%)`, right:'12%', bottom:'16%'}} />
                {matrix && (
                  <div
                    className="qr-grid"
                    style={{gridTemplateColumns:`repeat(${size}, 1fr)`, width:'88%', aspectRatio:1}}
                  >
                    {matrix.flatMap((row,y)=> row.map((isDark,x)=>{
                      const idx=y*size+x
                      const isGolden = idx===goldenId
                      const shouldFlip = (flipTick*0.7 + x*0.12 + y*0.12) % 2 > 1
                      let bg
                      if(isGolden) bg=undefined
                      else if(!isDark) bg='#fff'
                      else {
                        if(palette==='classic') bg='#0b0f1e'
                        else if(palette==='monochrome') bg='#0f172a'
                        else {
                          const base = palette==='neon'?180: palette==='sunset'?14:205
                          const h = (base + hue + x*2 + y*1.4)%360
                          bg=`hsl(${h} 92% 58%)`
                        }
                      }
                      return (
                        <div
                          key={idx}
                          onClick={()=> isGolden && switchTo3D()}
                          className={`qr-cell ${isDark?'dark':'light'} ${isGolden?'golden':''} ${shouldFlip?'flip':''}`}
                          style={{ background: bg, transitionDelay: `${(x+y)*12}ms` }}
                          title={isGolden?'✨ Golden portal — click to enter 3D':''}
                        />
                      )
                    }))}
                  </div>
                )}
                <div className="qr-overlay"><div className="scanline" /></div>
                <div style={{position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.65)', border:'1px solid rgba(255,255,255,0.12)', padding:'6px 10px', borderRadius:999, fontSize:11, color:'#e2e8f0', display:'flex', gap:8, alignItems:'center', backdropFilter:'blur(6px)'}}>
                  <span>🖱️ Scroll to morph</span><span style={{opacity:0.4}}>•</span><span>💛 Click gold tile → 3D</span>
                </div>
              </div>
            ) : (
              <div className="canvas-container">
                <VoxelScene
                  voxels={voxels}
                  qrSize={size}
                  projection={projection}
                  autoSpin={autoSpin}
                  animMode={animMode}
                  animateTick={animateTick}
                  showBase={showQRBase}
                />
                {/* floating animate hint */}
                <button
                  onClick={triggerAnimate}
                  className="floating-animate"
                  title="Click to animate the character"
                >
                  ✨ ANIMATE
                </button>
                {isRecording && <div className="rec-badge">● REC {fmtTime(recTime)}</div>}
              </div>
            )}
          </div>

          {!is3D && (
            <div style={{padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', background:'rgba(10,12,20,0.6)', fontSize:12, color:'#94a3b8'}}>
              <span>💡 <b style={{color:'#e2e8f0'}}>Cinematic scroll:</b> each wheel tick flips tiles with a staggered 3D cascade and shifts hue.</span>
              <span style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
                <label style={{display:'flex', gap:6, alignItems:'center', cursor:'pointer'}}><input type="checkbox" checked={showQRBase} onChange={e=> setShowQRBase(e.target.checked)} /> QR base plate</label>
              </span>
            </div>
          )}
          {is3D && (
            <div style={{padding:'10px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', background:'rgba(10,12,20,0.6)'}}>
              <span style={{fontSize:12, color:'#94a3b8', fontWeight:700}}>ANIMATE:</span>
              {[
                ['float','Float'],
                ['spin','Spin'],
                ['bounce','Bounce'],
                ['wave','Wave'],
                ['assemble','Assemble'],
              ].map(([id,label])=>(
                <button key={id} className={`btn btn-small ${animMode===id?'btn-primary':''}`} onClick={()=> { setAnimMode(id); setAnimateTick(k=>k+1)}}>{label}</button>
              ))}
              <button className="btn btn-small btn-primary" onClick={triggerAnimate} style={{marginLeft:4}}>✨ Animate now</button>
              <label style={{marginLeft:'auto', display:'flex', gap:6, alignItems:'center', fontSize:12, color:'#94a3b8', cursor:'pointer'}}>
                <input type="checkbox" checked={showQRBase} onChange={e=> setShowQRBase(e.target.checked)} /> QR floor
              </label>
            </div>
          )}
        </section>

        <aside className="right">
          <div className="panel-title">2 — Choose voxel avatar</div>
          <div className="hint" style={{marginBottom:10}}>Click the golden tile or pick here — your QR becomes this character in 3D. Each model is fully printable.</div>
          <div className="char-grid">
            {CHARACTERS.map(c=>(
              <div key={c.id} className={`char-card ${selectedId===c.id?'active':''}`} onClick={()=> { setSelectedId(c.id); if(!is3D) switchTo3D(); else setAnimateTick(k=>k+1)}}>
                <div className="char-emoji">{c.emoji}</div>
                <div className="char-name">{c.name}</div>
                <div className="char-desc">{c.desc}</div>
                {selectedId===c.id && <div className="char-check">✓</div>}
              </div>
            ))}
          </div>

          <div className="panel-title">View controls (3D)</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <button className={`btn ${projection==='perspective'?'':'btn-primary'}`} onClick={()=> setProjection('perspective')}>◩ Perspective (natural)</button>
            <button className={`btn ${projection==='isometric'?'btn-primary':''}`} onClick={()=> setProjection('isometric')}>◪ Isometric (print view)</button>
            <button className={`btn ${autoSpin?'btn-primary':''}`} onClick={()=> setAutoSpin(v=>!v)}>{autoSpin?'⏸︎ Auto-spin ON':'▶︎ Auto-spin OFF'}</button>
            <button className="btn btn-primary" onClick={triggerAnimate}>✨ Animate Character</button>
            {!isRecording ? (
              <button className="btn" onClick={startRecording}>● Record Video (WebM)</button>
            ) : (
              <button className="btn" onClick={stopRecording} style={{background:'#dc2626', color:'#fff'}}>■ Stop Recording {fmtTime(recTime)}</button>
            )}
          </div>
          <div className="hint">In 3D: <b style={{color:'#e2e8f0'}}>Drag</b> orbit, <b style={{color:'#e2e8f0'}}>Scroll</b> zoom, <b style={{color:'#e2e8f0'}}>Right-drag / Shift+drag</b> pan. Use snapshot or video to capture poster.</div>

          <div className="panel-title">How printing works</div>
          <div style={{fontSize:12, color:'#94a3b8', lineHeight:1.6, background:'#0f1220', border:'1px solid var(--border)', borderRadius:12, padding:12}}>
            • <b style={{color:'#e2e8f0'}}>OBJ</b> keeps per-voxel colours (Blender: Import OBJ).<br/>
            • <b style={{color:'#e2e8f0'}}>STL</b> is single-colour solid for slicers (Prusa / Cura).<br/>
            • Voxel = 0.9mm + 0.1mm gap — clean on FDM.<br/>
            • Scale 3–5× in slicer, enable supports for overhangs.
          </div>

          <div style={{marginTop:14, display:'flex', gap:8}}>
            <button className="btn btn-ghost btn-small" onClick={()=> { setInput('https://example.com'); setPalette('classic'); setHue(0); setIs3D(false)}}>Reset</button>
            <button className="btn btn-primary btn-small" onClick={takeSnapshot}>📸 Save Poster</button>
          </div>
        </aside>
      </div>

      {/* CORPORATE FOOTER */}
      <footer className="corp-footer">
        <div className="corp-footer-inner">
          <div className="corp-col brand-col">
            <div className="corp-brand">
              <div className="brand-badge">◈</div>
              <span>QR VOXEL STUDIO</span>
            </div>
            <p className="corp-tagline">Cinematic 2D → 3D voxel QR studio. Create scannable art, animate it, and 3D-print it — all in your browser. No uploads. No tracking without consent.</p>
            <div className="corp-meta">
              <span>© {new Date().getFullYear()} QR Voxel Studio Pvt. Ltd.</span>
              <span>All rights reserved.</span>
              <span>Bengaluru • Paris</span>
            </div>
            <div className="love-line">
              Made with <span className="heart">♥</span> by <a href="https://www.linkedin.com/in/sankar4/" target="_blank" rel="noopener noreferrer">Sankar</a>
            </div>
          </div>

          <div className="corp-col">
            <h4>Product</h4>
            <a onClick={()=> window.scrollTo({top:0, behavior:'smooth'})}>Studio</a>
            <a onClick={()=> setLegalDoc('eula')}>Voxel Licence (EULA)</a>
            <a onClick={()=> setLegalDoc('disclaimer')}>3D Print Guide</a>
            <a href="#" onClick={e=>{e.preventDefault(); alert('Changelog: v1.3 — added video recording, corporate footer, improved voxel animations.')}}>Changelog</a>
            <a href="#" onClick={e=>{e.preventDefault(); alert('Roadmap: GLB export, AR preview, account sync, and team workspaces coming soon.')}}>Roadmap</a>
          </div>

          <div className="corp-col">
            <h4>Company</h4>
            <a onClick={()=> setLegalDoc('imprint')}>About / Imprint</a>
            <a href="https://www.linkedin.com/in/sankar4/" target="_blank" rel="noopener noreferrer">Contact — LinkedIn</a>
            <a onClick={()=> setLegalDoc('security')}>Security & Compliance</a>
            <a href="mailto:hello@qr-voxel.studio">hello@qr-voxel.studio</a>
            <a href="mailto:support@qr-voxel.studio">support@qr-voxel.studio</a>
          </div>

          <div className="corp-col">
            <h4>Legal & Privacy</h4>
            {LEGAL_LINKS.map(l=>(
              <a key={l.id} onClick={()=> setLegalDoc(l.id)}>{l.label}</a>
            ))}
            <a onClick={()=> setLegalDoc('consent')} style={{color:'#facc15'}}>Manage cookies / Consent</a>
          </div>

          <div className="corp-col">
            <h4>Resources</h4>
            <a href="https://threejs.org" target="_blank" rel="noopener noreferrer">Three.js</a>
            <a href="https://github.com/soldair/node-qrcode" target="_blank" rel="noopener noreferrer">QR Code spec</a>
            <a href="https://www.blender.org" target="_blank" rel="noopener noreferrer">Blender</a>
            <a href="https://www.prusa3d.com/prusaslicer/" target="_blank" rel="noopener noreferrer">PrusaSlicer</a>
            <a onClick={()=> window.scrollTo({top:0, behavior:'smooth'})}>Back to top ↑</a>
          </div>
        </div>

        <div className="corp-bottom">
          <div className="corp-bottom-left">
            <span>Privacy-first • No QR data leaves your device unless you export.</span>
            <span className="dot">•</span>
            <a onClick={()=> setLegalDoc('privacy')}>Privacy</a>
            <a onClick={()=> setLegalDoc('terms')}>Terms</a>
            <a onClick={()=> setLegalDoc('cookies')}>Cookies</a>
            <a onClick={()=> setLegalDoc('consent')}>Consent</a>
          </div>
          <div className="corp-bottom-right">
            <span>Built with Vite + React + @react-three/fiber • </span>
            <a href="https://www.linkedin.com/in/sankar4/" target="_blank" rel="noopener noreferrer" style={{color:'#facc15', fontWeight:800}}>Made with love — Sankar ↗</a>
          </div>
        </div>
      </footer>

      <CookieBanner onManage={()=> setLegalDoc('consent')} />
      <LegalModal docId={legalDoc} onClose={()=> setLegalDoc(null)} />
    </div>
  )
}
