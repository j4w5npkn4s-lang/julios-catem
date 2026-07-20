import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalEditarViaje({ viaje: v, onClose, onSaved }) {
  const { updateViaje, loadAll, agremiados, destinos, estimaciones, uploadFoto, today } = useApp()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  // Form state — prellenado con datos existentes
  const [tipo, setTipo]       = useState(v.tipo || 'sencillo')
  const isFull = tipo === 'full'

  const [tracto, setTracto]   = useState(v.tracto || '')
  const [operador, setOper]   = useState(v.operador || '')
  const [agremiadoId, setAgId]= useState(v.agremiado_id || '')

  // Gondola 1
  const [bid, setBid]         = useState(v.id || '')
  const [g1, setG1]           = useState(v.gondola1 || '')
  const [m1, setM1]           = useState(v.m3_1 || '')
  const [fSal, setFSal]       = useState(v.fecha_salida || today())
  const [hSal, setHSal]       = useState(v.hora_salida || '')
  const [fLleg, setFLleg]     = useState(v.fecha_llegada || '')
  const [hLleg, setHLleg]     = useState(v.hora_llegada || '')

  // Gondola 2 (solo Full)
  const [bid2, setBid2]       = useState(v.folio2 || '')
  const [g2, setG2]           = useState(v.gondola2 || '')
  const [m2, setM2]           = useState(v.m3_2 || '')
  const [fSal2, setFSal2]     = useState(v.fecha_salida2 || v.fecha_salida || today())
  const [hSal2, setHSal2]     = useState(v.hora_salida2 || '')
  const [fLleg2, setFLleg2]   = useState(v.fecha_llegada2 || '')
  const [hLleg2, setHLleg2]   = useState(v.hora_llegada2 || '')

  // Ruta y otros
  const [km, setKm]           = useState(v.km || '')
  const [mat, setMat]         = useState(v.material || '')
  const [origen, setOrigen]   = useState(v.origen || '')
  const [destino, setDestino] = useState(v.destino || '')
  const [estId, setEstId]     = useState(v.estimacion_id || '')
  const [estado, setEstado]   = useState(v.estado || 'abierto')
  const [notas, setNotas]     = useState(v.notas || '')

  // Fotos nuevas (si se suben reemplazan las existentes)
  const [fotoTSal, setFotoTSal]     = useState(null)
  const [fotoTSal2, setFotoTSal2]   = useState(null)
  const [fotoTracto, setFotoTracto] = useState(null)
  const [fotoLleg, setFotoLleg]     = useState(null)
  const [fotoLleg2, setFotoLleg2]   = useState(null)
  // Marcar fotos existentes para eliminar
  const [quitarTSal, setQuitarTSal]     = useState(false)
  const [quitarTSal2, setQuitarTSal2]   = useState(false)
  const [quitarTracto, setQuitarTracto] = useState(false)
  const [quitarLleg, setQuitarLleg]     = useState(false)
  const [quitarLleg2, setQuitarLleg2]   = useState(false)

  function handleOrigenChange(val) {
    setOrigen(val); setDestino(''); setKm('')
  }
  function handleDestinoChange(val) {
    setDestino(val)
    const d = destinos.find(x => x.origen === origen && x.destino === val && x.activo !== false)
    if (d?.km) setKm(String(d.km))
  }

  async function handleSave() {
    if (!tracto.trim()) return toast('Placa tracto requerida', 'err')
    setSaving(true)
    try {
      let urlTSal   = quitarTSal   ? null : v.foto_ticket_salida_url
      let urlTracto = quitarTracto ? null : v.foto_tracto_url
      let urlLleg   = quitarLleg   ? null : v.foto_ticket_llegada_url
      let urlTSal2  = quitarTSal2  ? null : v.foto_ticket2_url
      let urlLleg2  = quitarLleg2  ? null : v.foto_ticket_llegada2_url

      if (fotoTSal)   urlTSal   = await uploadFoto(fotoTSal,   `tickets/${bid}`)
      if (fotoTSal2)  urlTSal2  = await uploadFoto(fotoTSal2,  `tickets/${bid2||bid}`)
      if (fotoTracto) urlTracto = await uploadFoto(fotoTracto, `tickets/${bid}`)
      if (fotoLleg)   urlLleg   = await uploadFoto(fotoLleg,   `tickets/${bid}`)
      if (fotoLleg2)  urlLleg2  = await uploadFoto(fotoLleg2,  `tickets/${bid}-llegada2`)

      const payload = {
        tipo,
        folio2: isFull ? bid2 : null,
        tracto: tracto.toUpperCase(),
        gondola1: g1.toUpperCase(),
        gondola2: isFull ? g2.toUpperCase() : null,
        m3_1: parseFloat(m1) || 0,
        m3_2: isFull ? (parseFloat(m2) || 0) : 0,
        km: parseFloat(km) || 0,
        material: mat,
        origen, destino,
        fecha_salida: fSal,
        hora_salida: hSal || null,
        fecha_salida2: isFull ? (fSal2 || null) : null,
        hora_salida2: isFull ? (hSal2 || null) : null,
        fecha_llegada: fLleg || null,
        hora_llegada: hLleg || null,
        fecha_llegada2: isFull ? (fLleg2 || null) : null,
        hora_llegada2: isFull ? (hLleg2 || null) : null,
        operador,
        agremiado_id: agremiadoId || null,
        estimacion_id: estId || null,
        estado,
        notas,
        foto_ticket_salida: !!urlTSal,
        foto_tracto: !!urlTracto,
        foto_ticket_llegada: !!urlLleg,
        foto_ticket_salida_url: urlTSal,
        foto_ticket2_url: urlTSal2,
        foto_tracto_url: urlTracto,
        foto_ticket_llegada_url: urlLleg,
        foto_ticket_llegada2_url: urlLleg2,
      }

      // Si cambió el folio (ID primario), insertar nuevo y borrar el viejo
      const folioChanged = bid.trim() !== v.id
      if (folioChanged) {
        const { error: insErr } = await supabase.from('viajes').insert([{
          id: bid.trim(),
          ...payload,
          registrado_por: v.registrado_por,
        }])
        if (insErr) throw new Error('Error al guardar nuevo folio: ' + insErr.message)
        await supabase.from('viajes').delete().eq('id', v.id)
        await loadAll()
        toast(`Folio actualizado: ${v.id} → ${bid.trim()} ✓`, 'ok')
        onSaved?.(); onClose(); return
      }

      await updateViaje(v.id, payload)
      await loadAll()
      toast(`Ticket ${v.id} actualizado ✓`, 'ok')
      onSaved?.()
      onClose()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  // Estimacion actual del viaje (puede estar cerrada)
  const estActual = estimaciones.find(e => e.id === v.estimacion_id)
  const estCerrada = estActual && estActual.estado === 'cerrada'
  // Solo mostrar estimaciones abiertas + la actual si está cerrada
  const estOpciones = estimaciones.filter(e => e.estado === 'abierta' || e.id === v.estimacion_id)

  const QuitarFoto = ({ url, label, quitar, setQuitar }) => (
    <>
      {url && !quitar && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
          <a href={url} target="_blank" style={{ fontSize:10, color:'var(--info)' }}>Ver {label} actual →</a>
          <button type="button" className="btn btn-danger btn-xs" onClick={() => setQuitar(true)}><i className="ti ti-trash" />Quitar</button>
        </div>
      )}
      {quitar && (
        <div style={{ fontSize:10, color:'var(--err)', marginBottom:5 }}>
          ⚠ Foto marcada para eliminar — <button type="button" onClick={() => setQuitar(false)} style={{ background:'none', border:'none', color:'var(--info)', cursor:'pointer', textDecoration:'underline', fontSize:10, padding:0 }}>deshacer</button>
        </div>
      )}
    </>
  )

  const SectionTitle = ({ children, color }) => (
    <div style={{
      fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px',
      color: color || 'var(--acc)', background: 'var(--bg3)', border: `1px solid ${color || 'var(--acc)'}33`,
      borderRadius: 8, padding: '8px 12px', marginTop: 18, marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {children}
    </div>
  )

  return (
    <Modal title={`Editar ticket · ${v.id}`} onClose={onClose} lg
      footer={<>
        <button className="btn btn-out" onClick={onClose}>Cancelar</button>
        {estCerrada
          ? <div style={{ fontSize:11, color:'var(--err)', display:'flex', alignItems:'center', gap:6 }}>
              <i className="ti ti-lock" />Estimación cerrada · Reabre la estimación para editar
            </div>
          : <button className="btn btn-acc" onClick={handleSave} disabled={saving}>
              <i className="ti ti-device-floppy" />{saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
        }
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

      {/* ====== DATOS GENERALES (arriba) ====== */}
      <SectionTitle><i className="ti ti-id" />Datos generales</SectionTitle>
      <div className="row3">
        <div className="fg">
          <label>Agremiado</label>
          <select value={agremiadoId} onChange={e => setAgId(e.target.value)}>
            <option value="">— Sin agremiado —</option>
            {agremiados.filter(a => a.activo !== false).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div className="fg"><label>Placa Tracto</label><input value={tracto} onChange={e => setTracto(e.target.value.toUpperCase())} /></div>
        <div className="fg"><label>Operador</label><input value={operador} onChange={e => setOper(e.target.value)} /></div>
      </div>
      <div>
        <QuitarFoto url={v.foto_tracto_url} label="foto tracto" quitar={quitarTracto} setQuitar={setQuitarTracto} />
        <FotoSlot label="Foto del tracto" icon="truck" onCapture={f => { setFotoTracto(f); setQuitarTracto(false) }} done={!!fotoTracto} />
      </div>

      {/* RUTA */}
      <div className="row2" style={{ marginTop: 12 }}>
        <div className="fg">
          <label>Origen</label>
          <select value={origen} onChange={e => handleOrigenChange(e.target.value)}>
            <option value="">— Selecciona origen —</option>
            {[...new Set(destinos.filter(d=>d.activo!==false).map(d=>d.origen))].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>Destino</label>
          <select value={destino} onChange={e => handleDestinoChange(e.target.value)} disabled={!origen}>
            <option value="">— Selecciona destino —</option>
            {destinos.filter(d=>d.activo!==false && d.origen===origen).map(d => <option key={d.id} value={d.destino}>{d.destino} ({d.km} km)</option>)}
          </select>
        </div>
      </div>
      <div className="row2">
        <div className="fg"><label>KM <span style={{ fontWeight:400, fontSize:9, color:'var(--muted)', textTransform:'none', letterSpacing:0 }}>(autorrellena con ruta)</span></label><input type="number" value={km} onChange={e => setKm(e.target.value)} /></div>
        <div className="fg"><label>Material</label><input value={mat} onChange={e => setMat(e.target.value)} /></div>
      </div>

      {/* ====== GONDOLA 1 ====== */}
      <SectionTitle color="#3B82F6"><i className="ti ti-circle-number-1" />Gondola 1{isFull ? '' : ' (única)'}</SectionTitle>
      <div className="row3">
        <div className="fg"><label>Folio Ticket {isFull?'1':''}</label><input value={bid} onChange={e => setBid(e.target.value)} placeholder="2605258380001" /></div>
        <div className="fg"><label>Placa Gondola</label><input value={g1} onChange={e => setG1(e.target.value.toUpperCase())} /></div>
        <div className="fg"><label>M³</label><input type="number" value={m1} onChange={e => setM1(e.target.value)} step="0.01" /></div>
      </div>
      <div className="row2">
        <div className="fg"><label>Fecha salida</label><input type="date" value={fSal} onChange={e => setFSal(e.target.value)} /></div>
        <div className="fg"><label>Hora salida</label><input type="time" value={hSal} onChange={e => setHSal(e.target.value)} /></div>
      </div>
      <div className="row2">
        <div className="fg"><label>Fecha llegada</label><input type="date" value={fLleg} onChange={e => setFLleg(e.target.value)} /></div>
        <div className="fg"><label>Hora llegada</label><input type="time" value={hLleg} onChange={e => setHLleg(e.target.value)} /></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <QuitarFoto url={v.foto_ticket_salida_url} label={`ticket salida${isFull?' 1':''}`} quitar={quitarTSal} setQuitar={setQuitarTSal} />
          <FotoSlot label={`Ticket salida${isFull?' 1':''}`} onCapture={f => { setFotoTSal(f); setQuitarTSal(false) }} done={!!fotoTSal} />
        </div>
        <div>
          <QuitarFoto url={v.foto_ticket_llegada_url} label={`ticket llegada${isFull?' 1':''}`} quitar={quitarLleg} setQuitar={setQuitarLleg} />
          <FotoSlot label={`Ticket llegada${isFull?' 1':''}`} onCapture={f => { setFotoLleg(f); setQuitarLleg(false) }} done={!!fotoLleg} />
        </div>
      </div>

      {/* ====== GONDOLA 2 (solo Full) ====== */}
      {isFull && (
        <>
          <SectionTitle color="#A855F7"><i className="ti ti-circle-number-2" />Gondola 2</SectionTitle>
          <div className="row3">
            <div className="fg"><label>Folio Ticket 2</label><input value={bid2} onChange={e => setBid2(e.target.value)} placeholder="2605258380002" /></div>
            <div className="fg"><label>Placa Gondola</label><input value={g2} onChange={e => setG2(e.target.value.toUpperCase())} /></div>
            <div className="fg"><label>M³</label><input type="number" value={m2} onChange={e => setM2(e.target.value)} step="0.01" /></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Fecha salida</label><input type="date" value={fSal2} onChange={e => setFSal2(e.target.value)} /></div>
            <div className="fg"><label>Hora salida</label><input type="time" value={hSal2} onChange={e => setHSal2(e.target.value)} /></div>
          </div>
          <div className="row2">
            <div className="fg"><label>Fecha llegada</label><input type="date" value={fLleg2} onChange={e => setFLleg2(e.target.value)} /></div>
            <div className="fg"><label>Hora llegada</label><input type="time" value={hLleg2} onChange={e => setHLleg2(e.target.value)} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <QuitarFoto url={v.foto_ticket2_url} label="ticket salida 2" quitar={quitarTSal2} setQuitar={setQuitarTSal2} />
              <FotoSlot label="Ticket salida 2" onCapture={f => { setFotoTSal2(f); setQuitarTSal2(false) }} done={!!fotoTSal2} />
            </div>
            <div>
              <QuitarFoto url={v.foto_ticket_llegada2_url} label="ticket llegada 2" quitar={quitarLleg2} setQuitar={setQuitarLleg2} />
              <FotoSlot label="Ticket llegada 2" onCapture={f => { setFotoLleg2(f); setQuitarLleg2(false) }} done={!!fotoLleg2} />
            </div>
          </div>
        </>
      )}

      {/* ====== ESTADO Y NOTAS ====== */}
      <SectionTitle color="#22C55E"><i className="ti ti-settings" />Estado y estimación</SectionTitle>
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
          <select value={estId} onChange={e => setEstId(e.target.value)} disabled={estCerrada}>
            <option value="">— Sin estimación —</option>
            {estOpciones.map(e => <option key={e.id} value={e.id}>{e.id}{e.estado==='cerrada'?' (cerrada)':''}</option>)}
          </select>
          {estCerrada && <div style={{ fontSize:10, color:'var(--err)', marginTop:4 }}>⚠ Estimación cerrada — no se puede cambiar</div>}
        </div>
      </div>
      <div className="fg" style={{ marginTop:6 }}>
        <label>Notas</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones..." />
      </div>
    </Modal>
  )
}
