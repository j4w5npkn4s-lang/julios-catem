import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalConciliacion({ onClose, onSaved }) {
  const { viajes, estimaciones, crearConciliacion, vCobro, vPago, vM3, fmt, uploadFoto, today } = useApp()
  const toast = useToast()

  const [desc, setDesc]     = useState('')
  const [fecha, setFecha]   = useState(today())
  const [estId, setEstId]   = useState('')
  const [precio, setPrecio] = useState('')
  const [pod, setPod]       = useState(null)
  const [saving, setSaving] = useState(false)

  // Viajes elegibles: pendiente_conciliar
  const elegibles = useMemo(() => viajes.filter(v => v.estado === 'pendiente_conciliar'), [viajes])
  const [selec, setSelec] = useState(() => new Set(elegibles.map(v => v.id)))

  function toggleAll() {
    if (selec.size === elegibles.length) setSelec(new Set())
    else setSelec(new Set(elegibles.map(v => v.id)))
  }

  function toggle(id) {
    const s = new Set(selec)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelec(s)
  }

  const selecViajes = elegibles.filter(v => selec.has(v.id))
  const totalCobro  = selecViajes.reduce((a, v) => a + vCobro(v), 0)
  const totalPago   = selecViajes.reduce((a, v) => a + vPago(v), 0)

  async function handleSave() {
    if (selec.size === 0) return toast('Selecciona al menos un viaje', 'err')
    setSaving(true)
    try {
      let podUrl = null
      if (pod) podUrl = await uploadFoto(pod, `pods/${Date.now()}`)
      const id = 'CON-' + Date.now().toString().slice(-6)
      await crearConciliacion({
        id,
        estimacion_id: estId || null,
        descripcion: desc || id,
        fecha,
        precio_total: precio ? parseFloat(precio) : null,
        pod_url: podUrl,
      }, [...selec])
      toast(`Conciliación ${id} creada con ${selec.size} viaje(s)`, 'ok')
      onSaved?.()
      onClose()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Nueva conciliación" onClose={onClose} lg
      footer={<>
        <button className="btn btn-out" onClick={onClose}>Cancelar</button>
        <button className="btn btn-acc" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : `Crear conciliación (${selec.size} viajes)`}
        </button>
      </>}
    >
      <div className="row2">
        <div className="fg"><label>Descripción</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Conciliación Ene 2026" /></div>
        <div className="fg"><label>Fecha</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
      </div>
      <div className="row2">
        <div className="fg">
          <label>Estimación <span style={{ fontWeight: 400, fontSize: 9, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' }}>(opcional)</span></label>
          <select value={estId} onChange={e => setEstId(e.target.value)}>
            <option value="">— Sin estimación —</option>
            {estimaciones.filter(e => e.estado === 'abierta').map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
          </select>
        </div>
        <div className="fg"><label>Precio negociado ($) <span style={{ fontWeight: 400, fontSize: 9, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' }}>(opcional)</span></label><input type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Monto acordado" /></div>
      </div>

      {/* Selección de viajes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Viajes pendientes de conciliar ({elegibles.length})
        </div>
        <button className="btn btn-out btn-xs" onClick={toggleAll}>
          {selec.size === elegibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
        </button>
      </div>

      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 11 }}>
        {elegibles.length ? elegibles.map(v => (
          <div key={v.id} className="chkr">
            <input type="checkbox" checked={selec.has(v.id)} onChange={() => toggle(v.id)} />
            <label htmlFor={v.id} style={{ flex: 1, cursor: 'pointer' }}>
              <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--acc)' }}>{v.id}</span>
              {' · '}{v.tracto} · {v.operador} · {vM3(v)} m³
            </label>
            <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--cobro)', fontSize: 10 }}>{fmt(vCobro(v))}</span>
          </div>
        )) : (
          <div className="empty" style={{ padding: 20 }}><p>Sin viajes pendientes de conciliar</p></div>
        )}
      </div>

      {/* Totales */}
      <div style={{ display: 'flex', gap: 16, background: 'var(--bg3)', borderRadius: 7, padding: '9px 12px', marginBottom: 11, fontSize: 11, flexWrap: 'wrap' }}>
        <div><span style={{ color: 'var(--muted)' }}>Viajes seleccionados: </span><b>{selec.size}</b></div>
        <div><span style={{ color: 'var(--muted)' }}>Cobro total: </span><b style={{ color: 'var(--cobro)', fontFamily: "'Space Mono',monospace" }}>{fmt(totalCobro)}</b></div>
        <div><span style={{ color: 'var(--muted)' }}>Pago total: </span><b style={{ color: 'var(--pago)', fontFamily: "'Space Mono',monospace" }}>{fmt(totalPago)}</b></div>
      </div>

      <div className="fg">
        <label>POD — Documentos de conciliación</label>
        <FotoSlot label="Subir POD firmado (PDF o foto)" icon="file-type-pdf" accept="application/pdf,image/*" onCapture={setPod} />
      </div>
    </Modal>
  )
}
