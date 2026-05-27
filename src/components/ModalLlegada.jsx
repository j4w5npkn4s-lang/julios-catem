import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalLlegada({ viaje, onClose, onSaved }) {
  const { registrarLlegada, uploadFoto } = useApp()
  const toast = useToast()
  const [fecha, setFecha]   = useState('')
  const [hora, setHora]     = useState('')
  const [foto, setFoto]     = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!fecha) return toast('Ingresa la fecha de llegada', 'err')
    setSaving(true)
    try {
      let url = null
      if (foto) url = await uploadFoto(foto, `llegadas/${viaje.id}`)
      await registrarLlegada(viaje.id, fecha, hora || null, url)
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
      <div style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, fontSize: 11, color: '#60A5FA' }}>
        <b>Ticket {viaje.id}</b> · {viaje.tracto} · {viaje.operador}<br />
        <span style={{ color: 'var(--muted)' }}>Salida: {viaje.fecha_salida || '—'} {viaje.hora_salida || ''} · {viaje.mina || '—'}</span><br /><br />
        El camión puede haber llegado hoy o días antes. <b>Ingresa la fecha real de llegada.</b>
      </div>
      <div className="row2">
        <div className="fg"><label>Fecha llegada</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div className="fg"><label>Hora llegada</label><input type="time" value={hora} onChange={e => setHora(e.target.value)} /></div>
      </div>
      <FotoSlot label="Foto del ticket de término / descarga" onCapture={setFoto} />
      <div className="fg" style={{ marginTop: 9 }}>
        <label>Observaciones</label>
        <textarea rows={2} placeholder="..." />
      </div>
    </Modal>
  )
}
