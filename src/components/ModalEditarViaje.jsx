import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalEditarViaje({ viaje: v, onClose, onSaved }) {
  const { updateViaje, flotilla, agremiados, destinos, estimaciones, uploadFoto, today } = useApp()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  // Form state — prellenado con datos existentes
  const [tipo, setTipo]       = useState(v.tipo || 'sencillo')
  const [bid, setBid]         = useState(v.id || '')
  const [bid2, setBid2]       = useState(v.folio2 || '')
  const [tracto, setTracto]   = useState(v.tracto || '')
  const [g1, setG1]           = useState(v.gondola1 || '')
  const [g2, setG2]           = useState(v.gondola2 || '')
  const [m1, setM1]           = useState(v.m3_1 || '')
  const [m2, setM2]           = useState(v.m3_2 || '')
  const [km, setKm]           = useState(v.km || '')
  const [mat, setMat]         = useState(v.material || '')
  const [fSal, setFSal]       = useState(v.fecha_salida || today())
  const [hSal, setHSal]       = useState(v.hora_salida || '')
  const [fLleg, setFLleg]     = useState(v.fecha_llegada || '')
  const [hLleg, setHLleg]     = useState(v.hora_llegada || '')
  const [operador, setOper]   = useState(v.operador || '')
  const [origenDestId, setOD] = useState('')
  const [origen, setOrigen]   = useState(v.origen || '')
  const [destino, setDestino] = useState(v.destino || '')
  const [agremiadoId, setAgId]= useState(v.agremiado_id || '')
  const [estId, setEstId]     = useState(v.estimacion_id || '')
  const [estado, setEstado]   = useState(v.estado || 'abierto')
  const [notas, setNotas]     = useState(v.notas || '')

  // Fotos nuevas (si se suben reemplazan las existentes)
  const [fotoTSal, setFotoTSal]   = useState(null)
  const [fotoTracto, setFotoTracto] = useState(null)
  const [fotoLleg, setFotoLleg]   = useState(null)

  function handleDestinoChange(id) {
    setOD(id)
    if (!id) return
    const d = destinos.find(x => x.id === id)
    if (d) { setOrigen(d.origen); setDestino(d.destino); setKm(String(d.km)) }
  }

  async function handleSave() {
    if (!tracto.trim()) return toast('Placa tracto requerida', 'err')
    setSaving(true)
    try {
      let urlTSal   = v.foto_ticket_salida_url
      let urlTracto = v.foto_tracto_url
      let urlLleg   = v.foto_ticket_llegada_url

      if (fotoTSal)   urlTSal   = await uploadFoto(fotoTSal,   `tickets/${bid}`)
      if (fotoTracto) urlTracto = await uploadFoto(fotoTracto, `tickets/${bid}`)
      if (fotoLleg)   urlLleg   = await uploadFoto(fotoLleg,   `tickets/${bid}`)

      await updateViaje(v.id, {
        tipo,
        folio2: tipo === 'full' ? bid2 : null,
        tracto: tracto.toUpperCase(),
        gondola1: g1.toUpperCase(),
        gondola2: tipo === 'full' ? g2.toUpperCase() : null,
        m3_1: parseFloat(m1) || 0,
        m3_2: tipo === 'full' ? (parseFloat(m2) || 0) : 0,
        km: parseFloat(km) || 0,
        material: mat,
        origen, destino,
        fecha_salida: fSal,
        hora_salida: hSal || null,
        fecha_llegada: fLleg || null,
        hora_llegada: hLleg || null,
        operador,
        agremiado_id: agremiadoId || null,
        estimacion_id: estId || null,
        estado,
        notas,
        foto_ticket_salida: !!urlTSal,
        foto_tracto: !!urlTracto,
        foto_ticket_llegada: !!urlLleg,
        foto_ticket_salida_url: urlTSal,
        foto_tracto_url: urlTracto,
        foto_ticket_llegada_url: urlLleg,
      })
      toast(`Ticket ${v.id} actualizado ✓`, 'ok')
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
    <Modal title={`Editar ticket · ${v.id}`} onClose={onClose} lg
      footer={<>
        <button className="btn btn-out" onClick={onClose}>Cancelar</button>
        <button className="btn btn-acc" onClick={handleSave} disabled={saving}>
          <i className="ti ti-device-floppy" />{saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </>}>

      {/* TIPO */}
      <div className="tipo-sel">
        <div className={`tipo-btn${tipo==='sencillo'?' sel':''}`} onClick={() => setTipo('sencillo')}>
          <i className="ti ti-truck" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
          <div style={{ fontSize: 13, fontWeight: 700 }}>Sencillo</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>1 gondola · 1 folio</div>
        </div>
        <div className={`tipo-btn${tipo==='full'?' sel':''}`} onClick={() => setTipo('full')}>
          <i className="ti ti-truck" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
          <div style={{ fontSize: 13, fontWeight: 700 }}>Full</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>2 gondolas · 2 folios</div>
        </div>
      </div>

      {/* FOLIOS */}
      <div className="sdv">Folios</div>
      <div className="row2">
        <div className="fg"><label>Folio Ticket {tipo==='full'?'1':''}</label><input value={bid} onChange={e => setBid(e.target.value)} placeholder="2605258380001" /></div>
        {tipo === 'full' && <div className="fg"><label>Folio Ticket 2</label><input value={bid2} onChange={e => setBid2(e.target.value)} placeholder="2605258380002" /></div>}
      </div>

      {/* UNIDAD */}
      <div className="sdv">Unidad</div>
      <div className="row3">
        <div className="fg"><label>Placa Tracto</label><input value={tracto} onChange={e => setTracto(e.target.value.toUpperCase())} /></div>
        <div className="fg"><label>Gondola 1</label><input value={g1} onChange={e => setG1(e.target.value.toUpperCase())} /></div>
        <div className="fg"><label>M³ G1</label><input type="number" value={m1} onChange={e => setM1(e.target.value)} step="0.01" /></div>
      </div>
      {tipo === 'full' && (
        <div className="row2">
          <div className="fg"><label>Gondola 2</label><input value={g2} onChange={e => setG2(e.target.value.toUpperCase())} /></div>
          <div className="fg"><label>M³ G2</label><input type="number" value={m2} onChange={e => setM2(e.target.value)} step="0.01" /></div>
        </div>
      )}

      {/* AGREMIADO Y OPERADOR */}
      <div className="row2">
        <div className="fg">
          <label>Agremiado</label>
          <select value={agremiadoId} onChange={e => setAgId(e.target.value)}>
            <option value="">— Sin agremiado —</option>
            {agremiados.filter(a => a.activo !== false).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div className="fg"><label>Operador</label><input value={operador} onChange={e => setOper(e.target.value)} /></div>
      </div>

      {/* RUTA */}
      <div className="sdv">Ruta</div>
      <div className="fg">
        <label>Seleccionar ruta predefinida <span style={{ fontWeight:400, fontSize:9, textTransform:'none', letterSpacing:0, color:'var(--muted)' }}>(opcional — sobreescribe origen/destino/km)</span></label>
        <select value={origenDestId} onChange={e => handleDestinoChange(e.target.value)}>
          <option value="">— Selecciona ruta —</option>
          {destinos.filter(d => d.activo !== false).map(d => (
            <option key={d.id} value={d.id}>{d.origen} → {d.destino} ({d.km} km)</option>
          ))}
        </select>
      </div>
      <div className="row3">
        <div className="fg"><label>Origen</label><input value={origen} onChange={e => setOrigen(e.target.value)} /></div>
        <div className="fg"><label>Destino</label><input value={destino} onChange={e => setDestino(e.target.value)} /></div>
        <div className="fg"><label>KM</label><input type="number" value={km} onChange={e => setKm(e.target.value)} /></div>
      </div>
      <div className="fg"><label>Material</label><input value={mat} onChange={e => setMat(e.target.value)} /></div>

      {/* FECHAS */}
      <div className="sdv">Fechas</div>
      <div className="row2">
        <div className="fg"><label>Fecha salida</label><input type="date" value={fSal} onChange={e => setFSal(e.target.value)} /></div>
        <div className="fg"><label>Hora salida</label><input type="time" value={hSal} onChange={e => setHSal(e.target.value)} /></div>
      </div>
      <div className="row2">
        <div className="fg"><label>Fecha llegada</label><input type="date" value={fLleg} onChange={e => setFLleg(e.target.value)} /></div>
        <div className="fg"><label>Hora llegada</label><input type="time" value={hLleg} onChange={e => setHLleg(e.target.value)} /></div>
      </div>

      {/* ESTADO Y ESTIMACIÓN */}
      <div className="row2">
        <div className="fg">
          <label>Estado</label>
          <select value={estado} onChange={e => setEstado(e.target.value)}>
            <option value="abierto">Abierto</option>
            <option value="pendiente_conciliar">Pendiente de conciliar</option>
            <option value="en_conciliacion">En conciliación</option>
            <option value="pendiente_pago">Pendiente de pago</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>
        <div className="fg">
          <label>Estimación <span style={{ fontWeight:400, fontSize:9, textTransform:'none', letterSpacing:0, color:'var(--muted)' }}>(opcional)</span></label>
          <select value={estId} onChange={e => setEstId(e.target.value)}>
            <option value="">— Sin estimación —</option>
            {estAbiertas.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
          </select>
        </div>
      </div>

      {/* FOTOS */}
      <div className="sdv">Fotos <span style={{ fontWeight:400, fontSize:9, textTransform:'none', letterSpacing:0, color:'var(--muted)' }}>(solo si quieres reemplazar la foto existente)</span></div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          {v.foto_ticket_salida_url && <a href={v.foto_ticket_salida_url} target="_blank" style={{ fontSize:10, color:'var(--info)', display:'block', marginBottom:5 }}>Ver ticket salida actual →</a>}
          <FotoSlot label="Reemplazar ticket salida" onCapture={setFotoTSal} done={!!fotoTSal} />
        </div>
        <div>
          {v.foto_tracto_url && <a href={v.foto_tracto_url} target="_blank" style={{ fontSize:10, color:'var(--info)', display:'block', marginBottom:5 }}>Ver foto tracto actual →</a>}
          <FotoSlot label="Reemplazar foto tracto" icon="truck" onCapture={setFotoTracto} done={!!fotoTracto} />
        </div>
        <div>
          {v.foto_ticket_llegada_url && <a href={v.foto_ticket_llegada_url} target="_blank" style={{ fontSize:10, color:'var(--info)', display:'block', marginBottom:5 }}>Ver ticket llegada actual →</a>}
          <FotoSlot label="Reemplazar ticket llegada" onCapture={setFotoLleg} done={!!fotoLleg} />
        </div>
      </div>

      <div className="fg" style={{ marginTop:10 }}>
        <label>Notas</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones..." />
      </div>
    </Modal>
  )
}
