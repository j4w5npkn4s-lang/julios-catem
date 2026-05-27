import { useState, useEffect } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalTicket({ onClose, onSaved }) {
  const { addViaje, vCobro, vPago, vUtil, fmt, config, minas, estimaciones, uploadFoto, perm, today } = useApp()
  const toast = useToast()
  const [tipo, setTipo]     = useState('sencillo')
  const [saving, setSaving] = useState(false)

  // Barcode scanner
  const [scanActive, setScanActive]   = useState(false)
  const [scanStream, setScanStream]   = useState(null)

  // Form state
  const [bid, setBid]         = useState('')
  const [estId, setEstId]     = useState('')
  const [mina, setMina]       = useState('')
  const [tracto, setTracto]   = useState('')
  const [eco, setEco]         = useState('')
  const [g1, setG1]           = useState('')
  const [g2, setG2]           = useState('')
  const [m1, setM1]           = useState('')
  const [m2, setM2]           = useState('')
  const [km, setKm]           = useState('')
  const [mat, setMat]         = useState('')
  const [fSal, setFSal]       = useState(today())
  const [hSal, setHSal]       = useState(new Date().toTimeString().slice(0,5))
  const [operador, setOper]   = useState('')
  const [notas, setNotas]     = useState('')

  // Fotos
  const [fotoTSal, setFotoTSal]     = useState(null)
  const [fotoTracto, setFotoTracto] = useState(null)
  const [fotoTSal2, setFotoTSal2]   = useState(null)

  // Calc
  const totalM3 = (parseFloat(m1)||0) + (tipo==='full' ? (parseFloat(m2)||0) : 0)
  const kmN     = parseFloat(km)||0
  const mockV   = { m3_1: parseFloat(m1)||0, m3_2: tipo==='full'?(parseFloat(m2)||0):0, km: kmN }
  const cobro   = config.tarifa_cobro ? vCobro(mockV) : 0
  const pago    = config.tarifa_pago  ? vPago(mockV)  : 0
  const util    = cobro - pago
  const canVerCalc = ['admin','contador'].includes(useApp().user?.rol)

  // Autofill km from mina
  useEffect(() => {
    if (!mina) return
    const m = minas.find(x => x.nombre === mina)
    if (m?.km_default) setKm(String(m.km_default))
  }, [mina, minas])

  // Autofill m3 from gondola history
  const { viajes } = useApp()
  function autoFillG(placa, setM) {
    if (!placa || placa.length < 3) return
    const prev = [...viajes].reverse().find(v => v.gondola1 === placa.toUpperCase() || v.gondola2 === placa.toUpperCase())
    if (prev) {
      const m3 = prev.gondola1 === placa.toUpperCase() ? prev.m3_1 : prev.m3_2
      if (m3) { setM(String(m3)); toast(`Gondola ${placa} → ${m3} m³ (último registro)`, 'ok') }
    }
  }

  // Scanner
  async function startScanner() {
    if (!('BarcodeDetector' in window)) { toast('Escáner no disponible en este navegador', 'warn'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      setScanStream(stream)
      setScanActive(true)
      const video = document.getElementById('scan-video')
      video.srcObject = stream
      video.play()
      const detector = new BarcodeDetector({ formats: ['code_128','code_39','ean_13','ean_8','itf'] })
      const scan = async () => {
        if (!scanActive) return
        try {
          const codes = await detector.detect(video)
          if (codes.length > 0) {
            setBid(codes[0].rawValue)
            stopScanner()
            toast('Código escaneado: ' + codes[0].rawValue, 'ok')
            return
          }
        } catch {}
        requestAnimationFrame(scan)
      }
      video.onloadedmetadata = () => requestAnimationFrame(scan)
    } catch (err) {
      toast(err.name === 'NotAllowedError' ? 'Permiso de cámara denegado' : 'No se pudo acceder a la cámara', 'err')
    }
  }

  function stopScanner() {
    scanStream?.getTracks().forEach(t => t.stop())
    setScanStream(null)
    setScanActive(false)
  }

  async function handleSave() {
    if (!bid) return toast('Ticket ID requerido', 'err')
    if (!m1 || !km) return toast('M³ y KM requeridos', 'err')
    setSaving(true)
    try {
      // Upload fotos
      let urlTSal = null, urlTracto = null, urlTSal2 = null
      if (fotoTSal)   urlTSal   = await uploadFoto(fotoTSal,   `tickets/${bid}`)
      if (fotoTracto) urlTracto = await uploadFoto(fotoTracto, `tickets/${bid}`)
      if (fotoTSal2)  urlTSal2  = await uploadFoto(fotoTSal2,  `tickets/${bid}`)

      await addViaje({
        id: bid,
        tipo,
        tracto: tracto.toUpperCase() || '—',
        eco,
        gondola1: g1.toUpperCase() || '-',
        gondola2: tipo === 'full' ? g2.toUpperCase() : null,
        m3_1: parseFloat(m1) || 0,
        m3_2: tipo === 'full' ? (parseFloat(m2) || 0) : 0,
        km: kmN,
        estimacion_id: estId || null,
        estado: 'abierto',
        material: mat || '—',
        mina: mina || null,
        fecha_salida: fSal,
        hora_salida: hSal || null,
        operador: operador || '—',
        foto_ticket_salida: !!urlTSal,
        foto_tracto: !!urlTracto,
        foto_ticket_salida_url: urlTSal,
        foto_tracto_url: urlTracto,
        notas,
      })
      toast(`Ticket ${bid} registrado · Tipo: ${tipo.toUpperCase()}`, 'ok')
      onSaved?.()
      onClose()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  const estAbiertas = estimaciones.filter(e => e.estado === 'abierta')

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
        </>}
      >
        {/* TIPO */}
        <div className="sdv">Tipo de unidad</div>
        <div className="tipo-sel">
          <div className={`tipo-btn${tipo==='sencillo'?' sel':''}`} onClick={() => setTipo('sencillo')}>
            <i className="ti ti-truck" />
            <div style={{ fontSize: 12, fontWeight: 600 }}>Sencillo</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>1 tracto · 1 caja</div>
          </div>
          <div className={`tipo-btn${tipo==='full'?' sel':''}`} onClick={() => setTipo('full')}>
            <i className="ti ti-truck" />
            <div style={{ fontSize: 12, fontWeight: 600 }}>Full</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>1 tracto · 2 cajas · 2 tickets</div>
          </div>
        </div>

        {/* TICKET ID */}
        <div className="sdv">Datos del ticket</div>
        <div className="row3">
          <div className="fg">
            <label>Ticket ID</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={bid} onChange={e => setBid(e.target.value)} placeholder="2305238390016" style={{ flex: 1 }} />
              <button type="button" className="btn btn-out" style={{ padding: '0 10px', flexShrink: 0 }} onClick={startScanner}>
                <i className="ti ti-barcode" style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
          <div className="fg">
            <label>Estimación <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 9, color: 'var(--muted)' }}>(opcional)</span></label>
            <select value={estId} onChange={e => setEstId(e.target.value)}>
              <option value="">— Sin estimación —</option>
              {estAbiertas.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Mina / Destino</label>
            <select value={mina} onChange={e => setMina(e.target.value)}>
              <option value="">— Selecciona —</option>
              {minas.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
            </select>
          </div>
        </div>

        {/* UNIDADES */}
        <div className="sdv">Unidades</div>
        <div className="row3">
          <div className="fg">
            <label>Tractor Placa</label>
            <input value={tracto} onChange={e => setTracto(e.target.value.toUpperCase())} placeholder="49TY4X" />
          </div>
          <div className="fg">
            <label>Tracto N°ECO</label>
            <input value={eco} onChange={e => setEco(e.target.value)} placeholder="ECO-01" />
          </div>
          <div className="fg">
            <label>Gondola / Caja 1</label>
            <input value={g1} onChange={e => setG1(e.target.value.toUpperCase())}
              onBlur={() => autoFillG(g1, setM1)} placeholder="87UJ4L" />
          </div>
        </div>
        {tipo === 'full' && (
          <div className="fg">
            <label>Gondola / Caja 2</label>
            <input value={g2} onChange={e => setG2(e.target.value.toUpperCase())}
              onBlur={() => autoFillG(g2, setM2)} placeholder="Segunda caja" />
          </div>
        )}

        {/* CARGA */}
        <div className="sdv">Carga y ruta</div>
        <div className="row3">
          <div className="fg">
            <label>M³ Caja 1</label>
            <input type="number" value={m1} onChange={e => setM1(e.target.value)} placeholder="30.00" step="0.01" />
          </div>
          {tipo === 'full' && (
            <div className="fg">
              <label>M³ Caja 2</label>
              <input type="number" value={m2} onChange={e => setM2(e.target.value)} placeholder="30.00" step="0.01" />
            </div>
          )}
          <div className="fg">
            <label>KM</label>
            <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="384" />
          </div>
          <div className="fg">
            <label>Material</label>
            <input value={mat} onChange={e => setMat(e.target.value)} placeholder="AI BALASTO" />
          </div>
        </div>

        {/* SALIDA */}
        <div className="sdv">Salida</div>
        <div className="row3">
          <div className="fg">
            <label>Fecha salida</label>
            <input type="date" value={fSal} onChange={e => setFSal(e.target.value)} />
          </div>
          <div className="fg">
            <label>Hora salida</label>
            <input type="time" value={hSal} onChange={e => setHSal(e.target.value)} />
          </div>
          <div className="fg">
            <label>Operador</label>
            <input value={operador} onChange={e => setOper(e.target.value)} placeholder="IVAN GARCIA" />
          </div>
        </div>

        {/* CALC — solo admin y contador */}
        {canVerCalc && totalM3 > 0 && kmN > 0 && (
          <div className="cbox" style={{ marginBottom: 11 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Cálculo automático · tarifa × KM × M³ total
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <div><div style={{ fontSize: 10, color: 'var(--muted)' }}>M³ total</div><div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{totalM3.toFixed(2)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Cobro</div><div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: 'var(--cobro)' }}>{fmt(cobro)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Pago</div><div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: 'var(--pago)' }}>{fmt(pago)}</div></div>
              <div><div style={{ fontSize: 10, color: 'var(--muted)' }}>Utilidad</div><div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: 'var(--util)' }}>{fmt(util)}</div></div>
            </div>
          </div>
        )}

        {/* FOTOS */}
        <div className="sdv">Fotos y documentos</div>
        <div className="row2">
          <div>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, marginBottom: 5 }}>TICKET SALIDA</div>
            <FotoSlot label="Foto ticket de salida" onCapture={setFotoTSal} />
            <FotoSlot label="Foto del tracto / unidad" icon="truck" onCapture={setFotoTracto} />
          </div>
          {tipo === 'full' && (
            <div>
              <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 700, marginBottom: 5 }}>TICKET CAJA 2 (FULL)</div>
              <FotoSlot label="Foto ticket caja 2" onCapture={setFotoTSal2} />
            </div>
          )}
        </div>

        <div className="fg" style={{ marginTop: 8 }}>
          <label>Notas</label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones..." />
        </div>
      </Modal>
    </>
  )
}
