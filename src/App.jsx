import { useCallback, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import VoxelScene from './components/VoxelScene.jsx'
import { CHARACTERS, CHARACTER_GROUPS } from './data/characters.js'
import { buildStructure, paintStructure, findGoldenCell, modelCells, logoModules } from './utils/voxelModel.js'
import { renderLabel, MAX_NAME } from './data/voxelFont.js'
import { exportOBJ, exportSTL, extractSurface, inspectSurface, downloadText, downloadBinary, MM_PER_VOXEL } from './utils/exporters.js'
import { LEGAL_DOCS, LEGAL_LINKS } from './data/legal.js'
import { TAGLINE, TAGLINE_FULL } from './data/brand.js'

const PALETTE_KEYS = ['classic', 'neon', 'sunset', 'ocean', 'monochrome']

// The coloured palettes shift hue per module. Left at a fixed HSL lightness some
// modules land on bright yellow and others on deep blue, and a scanner has no
// single threshold to binarise against. Keep the hue drift, pin the luminance.
const DARK_LUMA = 80
const LUMA_W = [0.299, 0.587, 0.114]

function moduleTone(hDeg, sat = 0.9) {
  const h = ((((hDeg % 360) + 360) % 360) / 360)
  const k = (n) => (n + h * 12) % 12
  const a = sat * 0.5
  const f = (n) => (0.5 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255
  const rgb = [f(0), f(8), f(4)]
  const y = LUMA_W[0] * rgb[0] + LUMA_W[1] * rgb[1] + LUMA_W[2] * rgb[2]
  const scale = Math.min(1, DARK_LUMA / Math.max(1, y))
  const hex = (v) => Math.round(Math.max(0, Math.min(255, v * scale))).toString(16).padStart(2, '0')
  return `#${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`
}

function Brand() {
  return <span className="brandword">ANAM<i>[QR]</i>PHIC</span>
}

function LegalModal({ docId, onClose }) {
  const doc = docId ? LEGAL_DOCS[docId] : null
  if (!docId || !doc) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{doc.title}</h2>
            <p>Last updated: {doc.updated} • Anamqrphic Labs Pvt. Ltd.</p>
          </div>
          <button className="btn btn-small" onClick={onClose}>✕ Close</button>
        </div>
        <div className="modal-body">
          {doc.content.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) return <h3 key={i}>{line.replace(/\*\*/g, '')}</h3>
            if (line.startsWith('|')) return null
            if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
              return <li key={i} style={{ marginLeft: 18, color: '#cbd5e1' }}>{line.replace(/^[-•]\s*/, '')}</li>
            }
            if (line.trim() === '') return <br key={i} />
            const parts = line.split(/(\*\*.*?\*\*)/)
            return <p key={i}>{parts.map((p, j) => p.startsWith('**') ? <b key={j} style={{ color: '#fff' }}>{p.replace(/\*\*/g, '')}</b> : p)}</p>
          })}
        </div>
        <div className="modal-foot">
          <span>Questions? legal@anamqrphic.studio • privacy@anamqrphic.studio</span>
          <button className="btn btn-primary btn-small" onClick={onClose}>I understand</button>
        </div>
      </div>
    </div>
  )
}

function CookieBanner({ onManage }) {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem('qv_consent') === null } catch { return true }
  })
  if (!visible) return null
  const decide = (v) => {
    try { localStorage.setItem('qv_consent', v) } catch { /* private mode */ }
    setVisible(false)
  }
  return (
    <div className="cookie-banner">
      <div className="cookie-text">
        <b>We value your privacy</b>
        <span> We use essential cookies to run the studio and, with your consent, preference &amp; anonymized analytics cookies. Manage your choices anytime via the Consent Centre. <a onClick={onManage} style={{ color: '#facc15', cursor: 'pointer', textDecoration: 'underline' }}>Learn more</a>.</span>
      </div>
      <div className="cookie-actions">
        <button className="btn btn-small btn-ghost" onClick={() => decide('reject')}>Reject non-essential</button>
        <button className="btn btn-small" onClick={onManage}>Customise</button>
        <button className="btn btn-small btn-primary" onClick={() => decide('accept')}>Accept all</button>
      </div>
    </div>
  )
}

export default function App() {
  const [input, setInput] = useState('https://example.com  —  hello 3D QR!')
  const [label, setLabel] = useState('')
  const [photo, setPhoto] = useState(null) // { img, url, name }
  const [goldenPick, setGoldenPick] = useState(() => Math.random())
  const [hue, setHue] = useState(0)
  const [palette, setPalette] = useState('classic')
  const [revealed, setRevealed] = useState(false)
  const [selectedId, setSelectedId] = useState('sakura')
  const [projection, setProjection] = useState('perspective')
  const [autoSpin, setAutoSpin] = useState(false)
  const [animMode, setAnimMode] = useState('assemble')
  const [animateTick, setAnimateTick] = useState(0)
  const [fitTick, setFitTick] = useState(0)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [legalDoc, setLegalDoc] = useState(null)
  const [printAudit, setPrintAudit] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const fileRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  // Derived during render, never from an effect: setting state from an effect made
  // every keystroke a cascading update and blew React's nested-update limit.
  const { matrix, size } = useMemo(() => {
    try {
      const qr = QRCode.create(input || ' ', { errorCorrectionLevel: 'H' })
      const n = qr.modules.size
      const m = []
      for (let y = 0; y < n; y++) {
        const row = []
        for (let x = 0; x < n; x++) row.push(qr.modules.get(x, y) === 1)
        m.push(row)
      }
      return { matrix: m, size: n }
    } catch (e) { console.error(e); return { matrix: null, size: 0 } }
  }, [input])

  const selectedChar = useMemo(() => CHARACTERS.find(c => c.id === selectedId) || CHARACTERS[0], [selectedId])
  // Wrap the name to roughly the width of the code, so a long name does not
  // stretch the plate into a letterbox with a stamp-sized QR in the middle.
  const labelBits = useMemo(
    () => renderLabel(label, Math.max(34, Math.round((size + 6) * 1.45))),
    [label, size],
  )

  // Sample the photo down to one colour per module. Re-sampled whenever the code
  // changes size, so the inset always lands on exact module boundaries.
  const logo = useMemo(() => {
    if (!photo?.img || !size) return null
    const m = logoModules(size)
    const cv = document.createElement('canvas')
    cv.width = m
    cv.height = m
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    const src = photo.img
    const side = Math.min(src.naturalWidth, src.naturalHeight)
    ctx.drawImage(src, (src.naturalWidth - side) / 2, (src.naturalHeight - side) / 2, side, side, 0, 0, m, m)
    const d = ctx.getImageData(0, 0, m, m).data
    const colors = []
    for (let i = 0; i < m * m; i++) {
      const hex = (v) => v.toString(16).padStart(2, '0')
      colors.push(`#${hex(d[i * 4])}${hex(d[i * 4 + 1])}${hex(d[i * 4 + 2])}`)
    }
    return { size: m, colors }
  }, [photo, size])

  // The object URL has to outlive decoding — the panel thumbnail renders from it.
  // Revoke only when the photo is replaced or cleared.
  const setPhotoSafely = (next) => {
    setPhoto((prev) => {
      if (prev?.url && prev.url !== next?.url) URL.revokeObjectURL(prev.url)
      return next
    })
  }
  const pickPhoto = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => setPhotoSafely({ img, url, name: f.name })
    img.onerror = () => { URL.revokeObjectURL(url) }
    img.src = url
    e.target.value = ''
  }

  // Structure is geometry only, so palette and hue changes never rebuild it —
  // support-column solving is the expensive part and must not run on a slider drag.
  const structure = useMemo(
    () => buildStructure(matrix, size, selectedChar, { label: labelBits, logo }),
    [matrix, size, selectedChar, labelBits, logo],
  )

  const palFn = useCallback((x, y, isDark) => {
    if (!isDark) return '#f1f5f9'
    if (palette === 'classic') return '#0b0f1e'
    if (palette === 'monochrome') return '#0f172a'
    const baseHue = palette === 'neon' ? 180 : palette === 'sunset' ? 14 : 205
    return moduleTone(baseHue + hue + x * 3 + y * 2)
  }, [palette, hue])

  const colors = useMemo(() => paintStructure(structure, palFn), [structure, palFn])
  const goldenIndex = useMemo(() => findGoldenCell(structure, goldenPick), [structure, goldenPick])
  const cells = useMemo(() => modelCells(structure, colors), [structure, colors])

  const voxelCount = structure.plate.length + structure.avatar.length + structure.supports.length
  const printW = (structure.spanX - 3) * MM_PER_VOXEL
  const printD = (structure.spanZ - 3) * MM_PER_VOXEL

  const toggleReveal = () => setRevealed(v => !v)

  const triggerAnimate = () => {
    setRevealed(false)
    setAnimateTick(k => k + 1)
  }

  const randomizeAll = () => {
    const r = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
    setSelectedId(r.id)
    setGoldenPick(Math.random())
    setRevealed(false)
    setAnimMode('assemble')
    setAnimateTick(k => k + 1)
  }

  const takeSnapshot = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `anamqrphic-${selectedId}-${Date.now()}.png`
    a.click()
  }

  const audit = () => setPrintAudit(inspectSurface(extractSurface(cells)))

  const handleOBJ = () => {
    downloadText(exportOBJ(cells, `anamqrphic_${selectedId}`), `anamqrphic-${selectedId}.obj`, 'text/plain')
    audit()
  }
  const handleSTL = () => {
    downloadBinary(exportSTL(cells), `anamqrphic-${selectedId}.stl`, 'model/stl')
    audit()
  }

  const startRecording = async () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const stream = canvas.captureStream(60)
    let options = { mimeType: 'video/webm;codecs=vp9' }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8' }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm' }
    }
    const rec = new MediaRecorder(stream, options)
    chunksRef.current = []
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `anamqrphic-${selectedId}-${Date.now()}.webm`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      stream.getTracks().forEach(t => t.stop())
    }
    rec.start(100)
    recorderRef.current = rec
    setIsRecording(true)
    setRecTime(0)
    timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000)
  }
  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    setIsRecording(false)
    clearInterval(timerRef.current)
    setRecTime(0)
  }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-badge">◈</div>
          <span><Brand /></span><small>{TAGLINE}</small>
        </div>
        <div className="top-actions">
          <div className="pill"><span>●</span> {size}×{size} • {voxelCount.toLocaleString()} voxels</div>
          <button className="btn btn-ghost btn-small" onClick={() => setFitTick(k => k + 1)}>⤢ Fit to window</button>
          <button className="btn btn-primary" onClick={randomizeAll}>🎲 Randomize</button>
        </div>
      </header>

      <div className={`main${leftOpen ? '' : ' left-closed'}${rightOpen ? '' : ' right-closed'}`}>
        <aside className="left">
          <div className="pane-inner">
            <div className="panel-title">1 — Your link</div>
            <div className="input-wrap">
              <span className="input-icon">🔗</span>
              <input className="input" value={input} onChange={e => setInput(e.target.value)} placeholder="https://your-link.com" />
            </div>
            <div className="hint">Any URL, text or emoji. Error correction is High (30% redundancy), so the model survives a scuffed print.</div>

            <div className="panel-title">2 — Name plate</div>
            <div className="input-wrap">
              <span className="input-icon">🔤</span>
              <input
                className="input"
                value={label}
                maxLength={MAX_NAME}
                onChange={e => setLabel(e.target.value)}
                placeholder="Embossed below the code"
              />
            </div>
            <div className="hint">
              Raised in solid voxels on its own band below the QR, outside the quiet zone — part of the same printable body.
              {label ? <> <b style={{ color: '#facc15' }}>{MAX_NAME - label.length}</b> characters left.</> : ' Up to 24 characters.'}
            </div>

            <div className="panel-title">3 — Photo in the centre</div>
            <div className="toolbar">
              <button className="btn" onClick={() => fileRef.current?.click()}>🖼 Browse photo…</button>
              {photo && <button className="btn btn-ghost" onClick={() => setPhotoSafely(null)}>✕ Remove</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} hidden />
            {photo && (
              <div className="photo-row">
                <img src={photo.url} alt="" className="photo-thumb" />
                <div>
                  <b>{photo.name}</b>
                  <span>Inset at {logo?.size}×{logo?.size} modules — {((logo?.size ** 2 / (size * size)) * 100).toFixed(0)}% of the code, absorbed by error correction.</span>
                </div>
              </div>
            )}
            <div className="hint">Centre-cropped and sampled to one colour per module, laid flat into the middle of the plate. It stays scannable and exports in the coloured OBJ.</div>

            <div className="panel-title">Palette</div>
            <div className="segmented">
              {PALETTE_KEYS.map(k => (
                <button key={k} className={`seg-btn ${palette === k ? 'active' : ''}`} onClick={() => setPalette(k)}>{k}</button>
              ))}
            </div>
            <div className="slider-row">
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Hue</span>
              <input className="slider" type="range" min={0} max={360} value={hue} onChange={e => setHue(+e.target.value)} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#facc15' }}>{hue}°</span>
            </div>
            <div className="hint">Every dark module is pinned to one perceived luminance, so the code still binarises at any hue.</div>

            <div className="panel-title">The zenith view</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn btn-small ${revealed ? 'btn-primary' : ''}`} onClick={toggleReveal}>
                {revealed ? '↺ Drop into 3D' : '⌖ Rise to the zenith'}
              </button>
              <button className="btn btn-small" onClick={() => setGoldenPick(Math.random())}>✨ Re-roll gold tile</button>
            </div>
            <div className="hint">Tap the diorama and the camera flies to straight overhead while the avatar sinks into the plate, taking each module&apos;s colour. At the top the scene <b style={{ color: '#facc15' }}>is</b> the QR code.</div>

            <div className="panel-title">Export &amp; snapshot</div>
            <div className="toolbar">
              <button className="btn btn-primary" onClick={handleSTL}>⬣ Export STL</button>
              <button className="btn" onClick={handleOBJ}>⬢ Export OBJ</button>
              <button className="btn" onClick={takeSnapshot}>📸 Snapshot</button>
            </div>
            <div className="toolbar" style={{ marginTop: 8 }}>
              {!isRecording
                ? <button className="btn" onClick={startRecording} title="Record the canvas to WebM at 60fps">● Record video</button>
                : <button className="btn" onClick={stopRecording} style={{ background: '#dc2626', color: '#fff', borderColor: '#ef4444' }}>■ Stop ({fmtTime(recTime)})</button>}
              <button className="btn" onClick={() => { audit() }}>✓ Check printability</button>
            </div>

            <div className="print-card">
              <div className="print-row"><span>Plate size</span><b>{printW} × {printD} mm</b></div>
              <div className="print-row"><span>Voxel</span><b>{MM_PER_VOXEL} mm solid</b></div>
              <div className="print-row"><span>Support columns</span><b>{structure.supports.length}</b></div>
              {printAudit && (
                <>
                  <div className="print-row"><span>Triangles</span><b>{printAudit.triangles.toLocaleString()}</b></div>
                  <div className="print-row">
                    <span>Holes / boundary edges</span>
                    <b style={{ color: printAudit.closed ? '#4ade80' : '#f87171' }}>{printAudit.boundaryEdges}</b>
                  </div>
                  <div className={`print-verdict ${printAudit.closed ? 'ok' : 'bad'}`}>
                    {printAudit.closed
                      ? '✓ Closed solid — no holes, no gaps, nothing floating. Slice and print as-is.'
                      : '✗ Open mesh — do not print, please report this.'}
                  </div>
                </>
              )}
            </div>
            <div className="hint">One watertight body: a solid base slab, raised dark modules, the avatar welded to it, and support columns under anything that would otherwise float. STL is binary; OBJ carries per-vertex colour for Blender.</div>
          </div>
        </aside>

        <section className="stage">
          <div className="stage-header">
            <button className="pane-toggle" onClick={() => setLeftOpen(v => !v)} title={leftOpen ? 'Collapse left panel' : 'Expand left panel'}>
              {leftOpen ? '⟨' : '⟩'}
            </button>
            <div className="stage-title">
              <div className="view-tabs">
                <button className={`view-tab ${revealed ? 'active' : ''}`} onClick={() => setRevealed(true)}>▦ 2D code</button>
                <button className={`view-tab ${!revealed ? 'active' : ''}`} onClick={() => setRevealed(false)}>◈ 3D diorama</button>
              </div>
              <span className="badge">{revealed ? 'zenith • scannable' : `${projection} • ${animMode}`}</span>
            </div>
            <div className="stage-controls">
              <button className="btn btn-small" onClick={() => setFitTick(k => k + 1)}>⤢ Fit</button>
              <button className={`btn btn-small ${projection === 'isometric' ? 'btn-primary' : ''}`} onClick={() => setProjection(p => p === 'perspective' ? 'isometric' : 'perspective')}>Isometric</button>
              <button className={`btn btn-small ${autoSpin ? 'btn-primary' : ''}`} onClick={() => setAutoSpin(v => !v)}>{autoSpin ? '◐ Spin on' : '○ Spin off'}</button>
              {!isRecording
                ? <button className="btn btn-small" onClick={startRecording} style={{ background: '#fff', color: '#111' }}>● Rec</button>
                : <button className="btn btn-small" onClick={stopRecording} style={{ background: '#ef4444', color: '#fff' }}>■ {fmtTime(recTime)}</button>}
            </div>
            <button className="pane-toggle" onClick={() => setRightOpen(v => !v)} title={rightOpen ? 'Collapse right panel' : 'Expand right panel'}>
              {rightOpen ? '⟩' : '⟨'}
            </button>
          </div>

          <div className="viewport">
            <div className="canvas-container">
              <VoxelScene
                plateCells={structure.plate}
                plateColors={colors.plateColors}
                avatarCells={structure.avatar}
                avatarRest={colors.avatarRest}
                avatarSunk={colors.avatarSunk}
                goldenIndex={goldenIndex}
                span={structure.span}
                center={structure.center}
                projection={projection}
                autoSpin={autoSpin}
                animMode={animMode}
                animateTick={animateTick}
                fitTick={fitTick}
                revealed={revealed}
                onTap={toggleReveal}
              />
              {isRecording && <div className="rec-badge">● REC {fmtTime(recTime)}</div>}
            </div>
          </div>

          {/* Docked to the bottom of the stage so nothing ever floats over the code */}
          <div className="stage-foot">
            <span className="foot-label">Animate</span>
            {[['assemble', 'Assemble'], ['float', 'Float'], ['bounce', 'Bounce'], ['wave', 'Wave'], ['spin', 'Spin']].map(([id, label]) => (
              <button key={id} className={`btn btn-small ${animMode === id ? 'btn-primary' : ''}`} onClick={() => { setAnimMode(id); setRevealed(false); setAnimateTick(k => k + 1) }}>{label}</button>
            ))}
            <button className="btn btn-small" onClick={triggerAnimate}>✨ Replay</button>
            <span className="foot-hint" onClick={toggleReveal}>
              {revealed ? `Tap the code to see the ${selectedChar.name}` : 'Tap the scene to read it from above'}
            </span>
          </div>
        </section>

        <aside className="right">
          <div className="pane-inner">
            <div className="panel-title">4 — Choose your avatar</div>
            <div className="hint" style={{ marginBottom: 10 }}>From eye level it is a scene; from directly overhead it dissolves into the code. Every one prints as one solid piece.</div>
            {CHARACTER_GROUPS.map(group => (
              <div key={group}>
                <div className="group-title">{group}</div>
                <div className="char-grid">
                  {CHARACTERS.filter(c => c.group === group).map(c => (
                    <div
                      key={c.id}
                      className={`char-card ${selectedId === c.id ? 'active' : ''}`}
                      onClick={() => { setSelectedId(c.id); setRevealed(false); setAnimateTick(k => k + 1) }}
                    >
                      <div className="char-emoji">{c.emoji}</div>
                      <div className="char-name">{c.name}</div>
                      <div className="char-desc">{c.desc}</div>
                      {selectedId === c.id && <div className="char-check">✓</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="panel-title">View</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn" onClick={() => setFitTick(k => k + 1)}>⤢ Fit model to window</button>
              <button className={`btn ${projection === 'perspective' ? 'btn-primary' : ''}`} onClick={() => setProjection('perspective')}>◩ Perspective</button>
              <button className={`btn ${projection === 'isometric' ? 'btn-primary' : ''}`} onClick={() => setProjection('isometric')}>◪ Isometric</button>
              <button className={`btn ${autoSpin ? 'btn-primary' : ''}`} onClick={() => setAutoSpin(v => !v)}>{autoSpin ? '⏸︎ Auto-spin on' : '▶︎ Auto-spin off'}</button>
              <button className={`btn ${revealed ? 'btn-primary' : ''}`} onClick={toggleReveal}>{revealed ? '↺ Back to 3D' : '⌖ Read from above'}</button>
            </div>
            <div className="hint">Scroll zooms all the way from inside a single voxel out past the whole plate. <b style={{ color: '#e2e8f0' }}>Fit</b> re-frames the model at any time.</div>

            <div className="panel-title">Printing</div>
            <div className="how-card">
              • <b>STL</b> is binary and watertight — slice and print directly.<br />
              • <b>OBJ</b> carries per-vertex colour for Blender.<br />
              • Base slab keeps the whole plate one connected body.<br />
              • Support columns are added automatically under floating parts.<br />
              • At {MM_PER_VOXEL} mm per voxel this plate prints {printW} × {printD} mm.
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-small" onClick={() => { setInput('https://example.com'); setPalette('classic'); setHue(0); setRevealed(false) }}>Reset</button>
              <button className="btn btn-primary btn-small" onClick={takeSnapshot}>📸 Save poster</button>
            </div>
          </div>
        </aside>
      </div>

      <footer className="corp-footer">
        <div className="corp-footer-inner">
          <div className="corp-col brand-col">
            <div className="corp-brand">
              <div className="brand-badge">◈</div>
              <span><Brand /></span>
            </div>
            <div className="corp-sub">{TAGLINE}</div>
            <p className="corp-tagline"><b>{TAGLINE_FULL}.</b> Build a diorama at eye level, fly the camera to the zenith, and watch it resolve into a scannable code. Animate it, print it — all in your browser. No uploads. No tracking without consent.</p>
            <div className="corp-meta">
              <span>© {new Date().getFullYear()} Anamqrphic Labs Pvt. Ltd.</span>
              <span>All rights reserved.</span>
              <span>Bengaluru • Paris</span>
            </div>
            <div className="love-line">
              Made with <span className="heart">♥</span> by <a href="https://www.linkedin.com/in/sankar4/" target="_blank" rel="noopener noreferrer">Sankar</a>
            </div>
          </div>

          <div className="corp-col">
            <h4>Product</h4>
            <a onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Studio</a>
            <a onClick={() => setLegalDoc('eula')}>Voxel Licence (EULA)</a>
            <a onClick={() => setLegalDoc('disclaimer')}>3D Print Guide</a>
          </div>

          <div className="corp-col">
            <h4>Company</h4>
            <a onClick={() => setLegalDoc('imprint')}>About / Imprint</a>
            <a href="https://www.linkedin.com/in/sankar4/" target="_blank" rel="noopener noreferrer">Contact — LinkedIn</a>
            <a onClick={() => setLegalDoc('security')}>Security &amp; Compliance</a>
            <a href="mailto:hello@anamqrphic.studio">hello@anamqrphic.studio</a>
          </div>

          <div className="corp-col">
            <h4>Legal &amp; Privacy</h4>
            {LEGAL_LINKS.map(l => (
              <a key={l.id} onClick={() => setLegalDoc(l.id)}>{l.label}</a>
            ))}
            <a onClick={() => setLegalDoc('consent')} style={{ color: '#facc15' }}>Manage cookies / Consent</a>
          </div>

          <div className="corp-col">
            <h4>Resources</h4>
            <a href="https://threejs.org" target="_blank" rel="noopener noreferrer">Three.js</a>
            <a href="https://github.com/soldair/node-qrcode" target="_blank" rel="noopener noreferrer">QR Code spec</a>
            <a href="https://www.blender.org" target="_blank" rel="noopener noreferrer">Blender</a>
            <a href="https://www.prusa3d.com/prusaslicer/" target="_blank" rel="noopener noreferrer">PrusaSlicer</a>
            <a onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</a>
          </div>
        </div>

        <div className="corp-bottom">
          <div className="corp-bottom-left">
            <span>Privacy-first • No QR data leaves your device unless you export.</span>
            <span className="dot">•</span>
            <a onClick={() => setLegalDoc('privacy')}>Privacy</a>
            <a onClick={() => setLegalDoc('terms')}>Terms</a>
            <a onClick={() => setLegalDoc('cookies')}>Cookies</a>
          </div>
          <div className="corp-bottom-right">
            <span>{TAGLINE_FULL} • Built with Vite + React + @react-three/fiber • </span>
            <a href="https://www.linkedin.com/in/sankar4/" target="_blank" rel="noopener noreferrer" style={{ color: '#facc15', fontWeight: 800 }}>Made with love — Sankar ↗</a>
          </div>
        </div>
      </footer>

      <CookieBanner onManage={() => setLegalDoc('consent')} />
      <LegalModal docId={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  )
}
