import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalLlegada({ viaje, onClose, onSaved }) {
  const { registrarLlegada, uploadFoto } = useApp()
  const toast = useToast()
  const isFull = viaje?.tipo === 'full'

  const [fecha1, setFecha1] = useState('')
  const [hora1,  setHora1]  = useState('')
  const [foto1,  setFoto1]  = useState(null)
  const [fecha2, setFecha2] = useState('')
  const [hora2,  setHora2]  = useState('')
  const [foto2,  setFoto2]  = useState(null)
  const [obs,    setObs]    = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!fecha1) return toast('Ingresa la fecha de llegada', 'err')
    if (isFull && !fecha2) return toast('Ingresa la fecha de llegada de la Gondola 2', 'err')
    setSaving(true)
    try {
      let url1 = null, url2 = null
      if (foto1) url1 = await uploadFoto(foto1, `llegadas/${viaje.id}`)
      if (foto2) url2 = await uploadFoto(foto2, `llegadas/${viaje.folio2||viaje.id}-g2`)
      await registrarLlegada(viaje.id, fecha1, hora1||null, url1, url2, fecha2, hora2||null)
      toast(`Ticket ${viaje.id} · Llegada registrada ✓`, 'ok')
      onSaved?.()
      onClose()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Registrar llegada · Ticket de término" onClose={onClose}
      footer={<>
        <button className="btn btn-out" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ok" onClick={handleSave} disabled={saving}>
          <i className="ti ti-circle-check" />{saving ? 'Guardando...' : 'Confirmar llegada'}
        </button>
      </>}
    >
      {/* Info viaje */}
      <div style={{ background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', borderRadius:7, padding:'9px 12px', marginBottom:12, fontSize:11, color:'#60A5FA' }}>
        <b>{viaje.id}{viaje.folio2?' / '+viaje.folio2:''}</b> · {viaje.tracto} · {viaje.operador}<br/>
        <span style={{ color:'var(--muted)' }}>Salida: {viaje.fecha_salida||'—'} {viaje.hora_salida||''}</span>
      </div>

      {isFull ? (
        <>
          {/* Gondola 1 */}
          <div className="sdv">Gondola 1 — Folio {viaje.id}</div>
          <div className="row2">
            <div className="fg"><label>Fecha llegada G1</label><input type="date" value={fecha1} onChange={e=>setFecha1(e.target.value)} /></div>
            <div className="fg"><label>Hora llegada G1</label><input type="time" value={hora1} onChange={e=>setHora1(e.target.value)} /></div>
          </div>
          <FotoSlot label={`Ticket llegada 1 (${viaje.id})`} onCapture={setFoto1} />

          {/* Gondola 2 */}
          <div className="sdv" style={{ marginTop:10 }}>Gondola 2 — Folio {viaje.folio2||'—'}</div>
          <div className="row2">
            <div className="fg"><label>Fecha llegada G2</label><input type="date" value={fecha2} onChange={e=>setFecha2(e.target.value)} /></div>
            <div className="fg"><label>Hora llegada G2</label><input type="time" value={hora2} onChange={e=>setHora2(e.target.value)} /></div>
          </div>
          <FotoSlot label={`Ticket llegada 2 (${viaje.folio2||'Gondola 2'})`} onCapture={setFoto2} />
        </>
      ) : (
        <>
          <div className="row2">
            <div className="fg"><label>Fecha llegada</label><input type="date" value={fecha1} onChange={e=>setFecha1(e.target.value)} /></div>
            <div className="fg"><label>Hora llegada</label><input type="time" value={hora1} onChange={e=>setHora1(e.target.value)} /></div>
          </div>
          <FotoSlot label="Foto del ticket de término / descarga" onCapture={setFoto1} />
        </>
      )}

      <div className="fg" style={{ marginTop:9 }}>
        <label>Observaciones</label>
        <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={2} placeholder="..." />
      </div>
    </Modal>
  )
}
