import { useState, useEffect } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalTicket({ onClose, onSaved }) {
  const { addViaje, vCobro, vPago, fmt, config, destinos, estimaciones,
          flotilla, agremiados, uploadFoto, perm, today, user } = useApp()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [scanActive, setScanActive] = useState(false)
  const [scanStream, setScanStream] = useState(null)

  // Form
  const [bid, setBid]         = useState('')
  const [bid2, setBid2]       = useState('')
  const [estId, setEstId]     = useState('')
  const [origenDestId, setOD] = useState('')  // destino id (origen+destino+km)
  const [camionId, setCamionId] = useState('') // flotilla id
  const [mat, setMat]         = useState('')
  const [fSal, setFSal]       = useState(today())
  const [hSal, setHSal]       = useState(new Date().toTimeString().slice(0,5))
  const [operador, setOper]   = useState('')
  const [notas, setNotas]     = useState('')

  // Autofill from flotilla
  const [tipo, setTipo]       = useState('sencillo')
  const [tracto, setTracto]   = useState('')
  const [g1, setG1]           = useState('')
  const [g2, setG2]           = useState('')
  const [m1, setM1]           = useState('')
  const [m2, setM2]           = useState('')
  const [km, setKm]           = useState('')
  const [agremiadoNombre, setAgNombre] = useState('')
  const [agremiadoId, setAgId] = useState('')

  // Fotos
  const [fotoTSal, setFotoTSal]     = useState(null)
  const [fotoTSal2, setFotoTSal2]   = useState(null)
  const [fotoTracto, setFotoTracto] = useState(null)

  const canVerCalc = ['admin','contador'].includes(user?.rol)

  // When camion is selected, autofill everything
  function handleCamionChange(id) {
    setCamionId(id)
    if (!id) { setTracto(''); setG1(''); setG2(''); setM1(''); setM2(''); setTipo('sencillo'); setAgNombre(''); setAgId(''); return }
    const cam = flotilla.find(f => f.id === id)
    if (!cam) return
    setTipo(cam.tipo)
    setTracto(cam.placa_tracto)
    setG1(cam.placa_gondola1 || '')
    setG2(cam.placa_gondola2 || '')
    setM1(cam.m3_gondola1 ? String(cam.m3_gondola1) : '')
    setM2(cam.m3_gondola2 ? String(cam.m3_gondola2) : '')
    const ag = agremiados.find(a => a.id === cam.agremiado_id)
    setAgNombre(ag?.nombre || '')
    setAgId(cam.agremiado_id || '')
  }

  // When origen/destino is selected, autofill km
  function handleDestinoChange(id) {
    setOD(id)
    if (!id) { setKm(''); return }
    const d = destinos.find(x => x.id === id)
    if (d?.km) setKm(String(d.km))
  }

  // Calc
  const totalM3 = (parseFloat(m1)||0) + (tipo==='full' ? (parseFloat(m2)||0) : 0)
  const kmN     = parseFloat(km)||0
  const mockV   = { m3_1: parseFloat(m1)||0, m3_2: tipo==='full'?(parseFloat(m2)||0):0, km: kmN }
  const cobro   = config.tarifa_cobro ? vCobro(mockV) : 0
  const pago    = config.tarifa_pago  ? +((config.tarifa_pago * totalM3 * kmN).toFixed(2)) : 0

  // Scanner
  async function startScanner() {
    if (!('BarcodeDetector' in window)) { toast('Escáner no disponible en este navegador', 'warn'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setScanStream(stream); setScanActive(true)
      const video = document.getElementById('scan-video')
      video.srcObject = stream; video.play()
      const detector = new BarcodeDetector({ formats: ['code_128','code_39','ean_13','ean_8'] })
      const scan = async () => {
        try {
          const codes = await detector.detect(video)
          if (codes.length > 0) { setBid(codes[0].rawValue); stopScanner(); toast('Código: ' + codes[0].rawValue, 'ok'); return }
        } catch {}
        if (scanActive) requestAnimationFrame(scan)
      }
      video.onloadedmetadata = () => requestAnimationFrame(scan)
    } catch { toast('No se pudo acceder a la cámara', 'err') }
  }

  function stopScanner() {
    scanStream?.getTracks().forEach(t => t.stop())
    setScanStream(null); setScanActive(false)
  }

  async function handleSave() {
    if (!bid) return toast('Folio 1 requerido', 'err')
    if (tipo === 'full' && !bid2) return toast('Folio 2 requerido para viaje Full', 'err')
    if (!m1 || !km) return toast('M³ y KM requeridos', 'err')
    if (!camionId) return toast('Selecciona un camión de la flotilla', 'err')
    setSaving(true)
    try {
      let urlTSal = null, urlTSal2 = null, urlTracto = null
      if (fotoTSal)   urlTSal   = await uploadFoto(fotoTSal,   `tickets/${bid}`)
      if (fotoTSal2)  urlTSal2  = await uploadFoto(fotoTSal2,  `tickets/${bid2||bid}`)
      if (fotoTracto) urlTracto = await uploadFoto(fotoTracto, `tickets/${bid}`)

      const dest = destinos.find(d => d.id === origenDestId)

      await addViaje({
        id: bid, folio2: tipo === 'full' ? bid2 : null, tipo,
        tracto: tracto.toUpperCase() || '—',
        gondola1: g1.toUpperCase() || '-',
        gondola2: tipo === 'full' ? g2.toUpperCase() : null,
        m3_1: parseFloat(m1)||0,
        m3_2: tipo === 'full' ? (parseFloat(m2)||0) : 0,
        km: kmN,
        estimacion_id: estId || null,
        origen: dest?.origen || null,
        destino: dest?.destino || null,
        estado: 'abierto',
        material: mat || '—',
        mina: dest?.origen || null,
        fecha_salida: fSal, hora_salida: hSal || null,
        operador: operador || '—',
        agremiado_id: agremiadoId || null,
        foto_ticket_salida: !!urlTSal, foto_tracto: !!urlTracto,
        foto_ticket_salida_url: urlTSal, foto_tracto_url: urlTracto,
        foto_ticket2_url: urlTSal2 || null,
        notas,
      })
      toast(`Ticket ${bid} registrado ✓`, 'ok')
      onSaved?.(); onClose()
    } catch (err) { toast(err.message, 'err') }
    setSaving(false)
  }

  const estAbiertas = estimaciones.filter(e => e.estado === 'abierta')
  const flotillaActiva = flotilla.filter(f => f.activo !== false)

  return (
    <>
      {scanActive && (
        <div className="scanner-overlay">
          <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
            <video id="scan-video" autoPlay playsInline style={{ width: '100%', borderRadius: 8 }} />
            <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--acc)', borderRadius: 8, pointerEvents: 'none' }}>
              <div className="scanner-line" />
            </div>
          </div>
          <div style={{ color: '#fff', fontSize: 13, marginTop: 16 }}>Apunta al código de barras</div>
          <button className="btn btn-danger" style={{ marginTop: 16 }} onClick={stopScanner}>Cancelar</button>
        </div>
      )}

      <Modal title="Nuevo ticket de viaje" onClose={onClose} lg
        footer={<>
          <button className="btn btn-out" onClick={onClose}>Cancelar</button>
          <button className="btn btn-acc" onClick={handleSave} disabled={saving}>
            <i className="ti ti-circle-check" />{saving ? 'Guardando...' : 'Registrar ticket'}
          </button>
        </>}>

        {/* CAMIÓN (autofill) */}
        <div className="sdv">Seleccionar camión</div>
        <div className="fg">
          <label>Camión de la flotilla</label>
          <select value={camionId} onChange={e => handleCamionChange(e.target.value)}>
            <option value="">— Selecciona el camión —</option>
            {flotillaActiva.map(f => {
              const ag = agremiados.find(a => a.id === f.agremiado_id)
              return (
                <option key={f.id} value={f.id}>
                  [{f.tipo.toUpperCase()}] {f.placa_tracto} — {ag?.nombre || '—'} — {f.placa_gondola1}{f.placa_gondola2 ? ' + '+f.placa_gondola2 : ''}
                </option>
              )
            })}
          </select>
        </div>

        {/* Info autofill */}
        {camionId && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, fontSize: 11, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div><span style={{ color: 'var(--muted)' }}>Tipo: </span><b>{tipo.toUpperCase()}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Tracto: </span><b style={{ fontFamily: "'Space Mono',monospace" }}>{tracto}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Gondola(s): </span><b style={{ fontFamily: "'Space Mono',monospace" }}>{g1}{g2 ? ' + '+g2 : ''}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Agremiado: </span><b>{agremiadoNombre}</b></div>
          </div>
        )}

        {/* TICKET ID */}
        <div className="sdv">Datos del ticket</div>
        <div className="row2">
          <div className="fg">
            <label>Folio Ticket {tipo === 'full' ? '1 (Gondola 1)' : ''}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={bid} onChange={e => setBid(e.target.value)} placeholder="2605258380001" style={{ flex: 1 }} />
              <button type="button" className="btn btn-out" style={{ padding: '0 10px', flexShrink: 0 }} onClick={startScanner}>
                <i className="ti ti-barcode" style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
          {tipo === 'full' && (
            <div className="fg">
              <label>Folio Ticket 2 (Gondola 2)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={bid2} onChange={e => setBid2(e.target.value)} placeholder="2605258380002" style={{ flex: 1 }} />
                <button type="button" className="btn btn-out" style={{ padding: '0 10px', flexShrink: 0 }} onClick={startScanner}>
                  <i className="ti ti-barcode" style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
          )}
          <div className="fg">
            <label>Estimación <span style={{ fontWeight: 400, fontSize: 9, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' }}>(opcional)</span></label>
            <select value={estId} onChange={e => setEstId(e.target.value)}>
              <option value="">— Sin estimación —</option>
              {estAbiertas.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
            </select>
          </div>
        </div>

        {/* ORIGEN / DESTINO */}
        <div className="fg">
          <label>Origen → Destino</label>
          <select value={origenDestId} onChange={e => handleDestinoChange(e.target.value)}>
            <option value="">— Selecciona ruta —</option>
            {destinos.filter(d => d.activo !== false).map(d => (
              <option key={d.id} value={d.id}>{d.origen} → {d.destino} ({d.km} km)</option>
            ))}
          </select>
        </div>
        <div className="row2">
          <div className="fg"><label>KM</label><input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="384" /></div>
          <div className="fg"><label>Material</label><input value={mat} onChange={e => setMat(e.target.value)} placeholder="AI BALASTO" /></div>
        </div>

        {/* M³ editables */}
        <div className="row2">
          <div className="fg"><label>M³ Gondola 1</label><input type="number" value={m1} onChange={e => setM1(e.target.value)} placeholder="30.00" step="0.01" /></div>
          {tipo === 'full' && <div className="fg"><label>M³ Gondola 2</label><input type="number" value={m2} onChange={e => setM2(e.target.value)} placeholder="30.00" step="0.01" /></div>}
        </div>

        {/* SALIDA */}
        <div className="sdv">Salida</div>
        <div className="row3">
          <div className="fg"><label>Fecha salida</label><input type="date" value={fSal} onChange={e => setFSal(e.target.value)} /></div>
          <div className="fg"><label>Hora salida</label><input type="time" value={hSal} onChange={e => setHSal(e.target.value)} /></div>
          <div className="fg"><label>Operador</label><input value={operador} onChange={e => setOper(e.target.value)} placeholder="IVAN GARCIA" /></div>
        </div>

        {/* CALC */}
        {canVerCalc && totalM3 > 0 && kmN > 0 && (
          <div className="cbox" style={{ marginBottom: 11 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', marginBottom: 7, textTransform: 'uppercase' }}>Cálculo automático</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div><div style={{ fontSize: 10, color: 'var(--muted)' }}>M³ total</div><div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{totalM3.toFixed(2)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Cobro</div><div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: 'var(--cobro)' }}>{fmt(cobro)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Pago</div><div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: 'var(--pago)' }}>{fmt(pago)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Utilidad</div><div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: 'var(--util)' }}>{fmt(cobro-pago)}</div></div>
            </div>
          </div>
        )}

        {/* FOTOS */}
        <div className="sdv">Documentos</div>
        <FotoSlot label={tipo === 'full' ? 'Foto Ticket 1 (Gondola 1)' : 'Foto ticket de salida'} onCapture={setFotoTSal} />
        {tipo === 'full' && <FotoSlot label="Foto Ticket 2 (Gondola 2)" onCapture={setFotoTSal2} />}
        <FotoSlot label="Foto del tracto / unidad" icon="truck" onCapture={setFotoTracto} />

        <div className="fg" style={{ marginTop: 8 }}>
          <label>Notas</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones..." />
        </div>
      </Modal>
    </>
  )
}
