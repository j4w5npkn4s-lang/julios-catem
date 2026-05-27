// ViewEstimaciones.jsx
import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

export function ViewEstimaciones() {
  const { estimaciones, viajes, vCobro, vPago, vM3, fmt, addEstimacion, perm } = useApp()
  const toast = useToast()
  const [showNew, setShowNew] = useState(false)
  const [year, setYear]       = useState(2026)
  const YEARS = [2026, 2025, 2024]
  const p = perm()

  // New est form
  const [eid, setEid]   = useState('')
  const [desc, setDesc] = useState('')
  const [cli, setCli]   = useState('')
  const [km, setKm]     = useState('')
  const [yr, setYr]     = useState('2026')

  async function handleAddEst() {
    if (!eid) return toast('ID requerido', 'err')
    try {
      await addEstimacion({ id: eid, year: parseInt(yr), descripcion: desc, cliente: cli, km_ruta: parseFloat(km)||0, estado: 'abierta' })
      toast('Estimación creada', 'ok')
      setShowNew(false)
    } catch (err) { toast(err.message, 'err') }
  }

  const filtered = useMemo(() => estimaciones.filter(e => e.year === year), [estimaciones, year])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {YEARS.map(y => <button key={y} className={`ychip${year===y?' active':''}`} onClick={() => setYear(y)}>{y}</button>)}
        </div>
        <div style={{ flex: 1 }} />
        {p.canTodo && <button className="btn btn-acc btn-sm" onClick={() => setShowNew(true)}><i className="ti ti-plus" />Nueva estimación</button>}
      </div>

      <div className="est-grid">
        {filtered.map(e => {
          const vs  = viajes.filter(v => v.estimacion_id === e.id)
          const m3  = vs.reduce((a, v) => a + vM3(v), 0)
          const cob = vs.reduce((a, v) => a + vCobro(v), 0)
          const pag = vs.reduce((a, v) => a + vPago(v), 0)
          return (
            <div key={e.id} className={`ec ${e.estado}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>{e.id}</div>
                <Pill s={e.estado} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 2 }}>{vs.length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{m3.toFixed(2)} m³</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--cobro)' }}>{fmt(cob)}</div>
              <div style={{ fontSize: 11, marginTop: 3, display: 'flex', gap: 10 }}>
                <span style={{ color: 'var(--muted)' }}>Pago: <span style={{ color: 'var(--pago)' }}>{fmt(pag)}</span></span>
                <span style={{ color: 'var(--muted)' }}>Util: <span style={{ color: 'var(--util)' }}>{fmt(cob-pag)}</span></span>
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                {e.pods?.length > 0 && <button className="btn btn-out btn-xs" onClick={() => window.open(e.pods[0],'_blank')}><i className="ti ti-file-type-pdf" />OPEN FILE (POD)</button>}
                <button className="btn btn-out btn-xs">EDIT</button>
              </div>
            </div>
          )
        })}
        {!filtered.length && <div className="empty" style={{ gridColumn: '1/-1' }}><i className="ti ti-file-invoice" /><p>Sin estimaciones para {year}</p></div>}
      </div>

      {showNew && (
        <Modal title="Nueva estimación" onClose={() => setShowNew(false)}
          footer={<><button className="btn btn-out" onClick={() => setShowNew(false)}>Cancelar</button><button className="btn btn-acc" onClick={handleAddEst}>Crear</button></>}>
          <div className="row2">
            <div className="fg"><label>Año</label><select value={yr} onChange={e => setYr(e.target.value)}><option>2026</option><option>2025</option><option>2024</option></select></div>
            <div className="fg"><label>ID / Clave</label><input value={eid} onChange={e => setEid(e.target.value)} placeholder="01-TOLAT-26" /></div>
          </div>
          <div className="fg"><label>Descripción</label><input value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div className="fg"><label>Cliente / Empresa</label><input value={cli} onChange={e => setCli(e.target.value)} placeholder="MOTA ENGIL" /></div>
          <div className="fg"><label>KM ruta fija</label><input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="384" /></div>
        </Modal>
      )}
    </div>
  )
}

export default ViewEstimaciones
