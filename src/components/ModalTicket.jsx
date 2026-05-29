import { useState, useEffect } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalTicket({ onClose, onSaved }) {
  const { addViaje, addCamion, vCobro, vPago, fmt, config, destinos, estimaciones,
          flotilla, agremiados, uploadFoto, perm, today, user } = useApp()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [scanActive, setScanActive] = useState(false)
  const [scanStream, setScanStream] = useState(null)

  // Form
  const [bid, setBid]         = useState('')
  const [bid2, setBid2]       = useState('')
  const [estId, setEstId]     = useState('')
  const [origenSel, setOrigenSel] = useState('')
  const [destinoSel, setDestinoSel] = useState('')
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

  // Origens únicos
  const origenes = [...new Set(destinos.filter(d=>d.activo!==false).map(d=>d.origen))]
  // Destinos filtrados según origen seleccionado
  const destinosFiltrados = origenSel
    ? destinos.filter(d => d.activo!==false && d.origen === origenSel)
    : destinos.filter(d => d.activo!==false)

  function handleOrigenChange(val) {
    setOrigenSel(val)
    setDestinoSel('')
    setKm('')
  }

  function handleDestinoChange(val) {
    setDestinoSel(val)
    if (!val || !origenSel) { setKm(''); return }
    const d = destinos.find(x => x.origen === origenSel && x.destino === val && x.activo!==false)
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
    // Si no soporta BarcodeDetector, usar input file como fallback
    if (!('BarcodeDetector' in window)) {
      toast('Escáner no disponible — ingresa el folio manualmente', 'warn')
      return
    }
    try {
      // Pedir permiso primero
      const perm = await navigator.permissions.query({ name: 'camera' }).catch(() => ({ state: 'prompt' }))

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setScanStream(stream)
      setScanActive(true)

      // Esperar a que el video esté listo
      await new Promise(r => setTimeout(r, 300))
      const video = document.getElementById('scan-video')
      if (!video) { stream.getTracks().forEach(t => t.stop()); return }
      video.srcObject = stream
      video.setAttribute('playsinline', true)
      await video.play().catch(() => {})

      const detector = new BarcodeDetector({ formats: ['code_128','code_39','ean_13','ean_8','itf','codabar','upc_a','upc_e'] })
      let scanning = true

      const scan = async () => {
        if (!scanning) return
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video)
            if (codes.length > 0) {
              setBid(codes[0].rawValue)
              scanning = false
              stream.getTracks().forEach(t => t.stop())
              setScanStream(null)
              setScanActive(false)
              toast('✓ Código: ' + codes[0].rawValue, 'ok')
              return
            }
          }
        } catch {}
        if (scanning) setTimeout(scan, 200)
      }

      video.onloadedmetadata = () => scan()
      // Fallback si onloadedmetadata no dispara
      setTimeout(scan, 1000)

    } catch (err) {
      setScanActive(false)
      if (err.name === 'NotAllowedError') {
        toast('Permiso de cámara denegado. Ve a Configuración del navegador y activa la cámara.', 'err')
      } else {
        toast('No se pudo iniciar el escáner: ' + err.message, 'err')
      }
    }
  }

  function stopScanner() {
    scanStream?.getTracks().forEach(t => t.stop())
    setScanStream(null)
    setScanActive(false)
  }

  async function handleSave() {
    if (!bid) return toast('Folio 1 requerido', 'err')
    if (tipo === 'full' && !bid2) return toast('Folio 2 requerido para viaje Full', 'err')
    if (!m1 || !km) return toast('M³ y KM requeridos', 'err')
    // camionId es opcional - si no se seleccionó se crea el camión automáticamente
    setSaving(true)
    try {
      let urlTSal = null, urlTSal2 = null, urlTracto = null
      if (fotoTSal)   urlTSal   = await uploadFoto(fotoTSal,   `tickets/${bid}`)
      if (fotoTSal2)  urlTSal2  = await uploadFoto(fotoTSal2,  `tickets/${bid2||bid}`)
      if (fotoTracto) urlTracto = await uploadFoto(fotoTracto, `tickets/${bid}`)

      // Si no se seleccionó camión de flotilla, crear automáticamente
      let agIdFinal = agremiadoId || null
      if (!camionId && tracto.trim()) {
        const existente = flotilla.find(f => f.placa_tracto === tracto.toUpperCase())
        if (!existente) {
          try {
            await addCamion({
              tipo,
              placa_tracto: tracto.toUpperCase(),
              placa_gondola1: g1.toUpperCase() || null,
              m3_gondola1: parseFloat(m1) || 0,
              placa_gondola2: tipo === 'full' ? (g2.toUpperCase() || null) : null,
              m3_gondola2: tipo === 'full' ? (parseFloat(m2) || 0) : 0,
              agremiado_id: agIdFinal,
              ultimo_viaje: fSal,
            })
            toast(`Camión ${tracto.toUpperCase()} agregado a flotilla automáticamente`, 'ok')
          } catch { /* si falla no bloqueamos el ticket */ }
        }
      }

      await addViaje({
        id: bid, folio2: tipo === 'full' ? bid2 : null, tipo,
        tracto: tracto.toUpperCase() || '—',
        gondola1: g1.toUpperCase() || '-',
        gondola2: tipo === 'full' ? g2.toUpperCase() : null,
        m3_1: parseFloat(m1)||0,
        m3_2: tipo === 'full' ? (parseFloat(m2)||0) : 0,
        km: kmN,
        estimacion_id: estId || null,
        origen: origenSel || null,
        destino: destinoSel || null,
        estado: 'abierto',
        material: mat || '—',
        mina: origenSel || null,
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
            <video id="scan-video" autoPlay playsInline muted style={{ width: '100%', borderRadius: 8, background: '#000' }} />
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

        {/* TIPO — botones grandes */}
        <div className="tipo-sel">
          <div className={`tipo-btn${tipo==='sencillo'?' sel':''}`} onClick={() => { setTipo('sencillo'); setCamionId(''); }}>
            <i className="ti ti-truck" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Sencillo</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>1 tracto · 1 gondola · 1 folio</div>
          </div>
          <div className={`tipo-btn${tipo==='full'?' sel':''}`} onClick={() => { setTipo('full'); setCamionId(''); }}>
            <i className="ti ti-truck" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Full</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>1 tracto · 2 gondolas · 2 folios</div>
          </div>
        </div>

        {/* CAMIÓN — seleccionar de flotilla O escribir directo */}
        <div className="sdv">Camión</div>
        <div className="fg">
          <label>Buscar en flotilla <span style={{ fontWeight:400, fontSize:9, textTransform:'none', letterSpacing:0, color:'var(--muted)' }}>(opcional — puedes escribir directo abajo)</span></label>
          <select value={camionId} onChange={e => handleCamionChange(e.target.value)}>
            <option value="">— Selecciona de flotilla o escribe placa abajo —</option>
            {flotillaActiva.filter(f => f.tipo === tipo).map(f => {
              const ag = agremiados.find(a => a.id === f.agremiado_id)
              return (
                <option key={f.id} value={f.id}>
                  {f.placa_tracto} — {ag?.nombre || '—'} — {f.placa_gondola1}{f.placa_gondola2 ? ' + '+f.placa_gondola2 : ''}
                </option>
              )
            })}
          </select>
        </div>
        {camionId && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 7, padding: '9px 12px', marginBottom: 8, fontSize: 11, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div><span style={{ color: 'var(--muted)' }}>Tracto: </span><b style={{ fontFamily:"'Space Mono',monospace" }}>{tracto}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Gondola(s): </span><b style={{ fontFamily:"'Space Mono',monospace" }}>{g1}{g2?' + '+g2:''}</b></div>
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
        <div className="row2">
          <div className="fg">
            <label>Origen</label>
            <select value={origenSel} onChange={e => handleOrigenChange(e.target.value)}>
              <option value="">— Selecciona origen —</option>
              {origenes.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Destino</label>
            <select value={destinoSel} onChange={e => handleDestinoChange(e.target.value)} disabled={!origenSel}>
              <option value="">— Selecciona destino —</option>
              {destinosFiltrados.map(d => <option key={d.id} value={d.destino}>{d.destino} ({d.km} km)</option>)}
            </select>
          </div>
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
