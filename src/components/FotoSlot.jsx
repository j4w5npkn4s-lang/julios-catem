import { useRef, useState } from 'react'

export default function FotoSlot({ label, icon = 'camera', onCapture, accept = 'image/*', done: externalDone }) {
  const inputRef = useRef(null)
  const [done, setDone]       = useState(false)
  const [preview, setPreview] = useState(null)
  const [fileName, setFileName] = useState('')

  const isDone = externalDone !== undefined ? externalDone : done

  function handleClick() {
    if (inputRef.current) inputRef.current.click()
  }

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

  const isAndroid = /Android/i.test(navigator.userAgent)
  const isIOS     = /iPhone|iPad/i.test(navigator.userAgent)
  const isMobile  = isAndroid || isIOS

  return (
    <div className={`fslot${isDone ? ' done' : ''}`} onClick={handleClick}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={isMobile ? 'environment' : undefined}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {preview ? (
        <img src={preview} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
      ) : (
        <i className={`ti ti-${isDone ? 'circle-check' : icon}`} />
      )}
      <div className="fsl">
        {isDone ? `✓ ${fileName || label}` : `📸 ${label}`}
      </div>
    </div>
  )
}
