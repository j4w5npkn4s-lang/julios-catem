import { useRef, useState } from 'react'

export default function FotoSlot({ label, icon = 'camera', onCapture, accept = 'image/*', done: externalDone }) {
  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)
  const [done, setDone]         = useState(false)
  const [preview, setPreview]   = useState(null)
  const [fileName, setFileName] = useState('')

  const isDone = externalDone !== undefined ? externalDone : done
  const isImageOnly = !accept.includes('pdf') && !accept.includes('.pdf')

  function handleChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setDone(true)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    onCapture?.(file)
  }

  // Si ya tiene foto, clic abre galería para reemplazar
  if (isDone) {
    return (
      <div className={`fslot done`} onClick={() => galleryRef.current?.click()}>
        <input ref={galleryRef} type="file" accept={accept} onChange={handleChange} style={{ display:'none' }} />
        {preview
          ? <img src={preview} style={{ width:36, height:36, objectFit:'cover', borderRadius:5, flexShrink:0 }} />
          : <i className="ti ti-circle-check" />
        }
        <div className="fsl">✓ {fileName || label} <span style={{ color:'var(--muted)', fontSize:9 }}>(toca para cambiar)</span></div>
      </div>
    )
  }

  return (
    <div className="fslot" style={{ flexDirection:'column', alignItems:'stretch', gap:0, padding:0 }}>
      {/* Inputs ocultos */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={handleChange} style={{ display:'none' }} />
      <input ref={galleryRef} type="file" accept={accept}  onChange={handleChange} style={{ display:'none' }} />

      {/* Label arriba */}
      <div style={{ padding:'8px 12px 6px', display:'flex', alignItems:'center', gap:8 }}>
        <i className={`ti ti-${icon}`} style={{ fontSize:16, color:'var(--muted)', flexShrink:0 }} />
        <div className="fsl">📸 {label}</div>
      </div>

      {/* Botones cámara / galería */}
      <div style={{ display:'flex', borderTop:'1px solid var(--border)' }}>
        {isImageOnly && (
          <button type="button"
            style={{ flex:1, padding:'7px 6px', background:'none', border:'none', borderRight:'1px solid var(--border)', cursor:'pointer', color:'var(--muted)', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
            onClick={() => cameraRef.current?.click()}>
            <i className="ti ti-camera" style={{ fontSize:14 }} />Cámara
          </button>
        )}
        <button type="button"
          style={{ flex:1, padding:'7px 6px', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
          onClick={() => galleryRef.current?.click()}>
          <i className="ti ti-photo" style={{ fontSize:14 }} />Galería
        </button>
      </div>
    </div>
  )
}
