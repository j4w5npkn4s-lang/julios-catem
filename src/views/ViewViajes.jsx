import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalLlegada from '../components/ModalLlegada'
import ModalPago from '../components/ModalPago'

export default function ViewViajes({ onNewTicket }) {
  const { viajes, estimaciones, vCobro, vPago, vUtil, vM3, fmt, reabrirViaje, perm } = useApp()
  const [fEst, setFEst]       = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fFecha, setFFecha]   = useState('')
  const [q, setQ]             = useState('')
  const [llegadaV, setLlegadaV] = useState(null)
  const [pagoV, setPagoV]     = useState(null)

  const p = perm() || {}

  const filtered = useMemo(() => viajes.filter(v => {
    if (fEst    && v.estimacion_id !== fEst) return false
    if (fStatus && v.estado !== fStatus) return false
    if (fFecha  && v.fecha_salida !== fFecha) return false
    if (q) {
      const s = q.toLowerCase()
      if (!(v.id + v.tracto + v.operador + (v.gondola1||'') + (v.estimacion_id||'')).toLowerCase().includes(s)) return false
    }
    return true
  }), [viajes, fEst, fStatus, fFecha, q])

  return (
    <div>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 11, flexWrap: 'wrap' }}>
        <select value={fEst} onChange={e => setFEst(e.target.value)} style={{ height: 28, fontSize: 11, padding: '0 7px', width: 150, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
          <option value="">Todas las estimaciones</option>
          {estimaciones.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ height: 28, fontSize: 11, padding: '0 7px', width: 160, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
          <option value="">Todos los estados</option>
          <option value="abierto">Abierto</option>
          <option value="pendiente_conciliar">Pend. conciliar</option>
          <option value="en_conciliacion">En conciliación</option>
          <option value="pendiente_pago">Pend. pago</option>
          <option value="cerrado">Cerrado</option>
        </select>
        <input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} style={{ height: 28, fontSize: 11, padding: '0 7px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." style={{ height: 28, fontSize: 11, padding: '0 9px', width: 180, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="tc">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>TICKET ID</th><th>TIPO</th><th>TRACTOR PLACA</th><th>GONDOLA</th><th>M³</th><th>KM</th>
                <th>ID ESTIMACIÓN</th><th>STATUS</th><th>FECHA SAL.</th><th>HORA SAL.</th>
                <th>N°ECO</th><th>MINA</th><th>FECHA LLE.</th><th>HORA LLE.</th>
                <th>OPERADOR</th><th>COBRO</th><th>PAGO</th><th>UTILIDAD</th>
                <th>FOTOS</th><th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map(v => (
                <tr key={v.id} className="tr">
                  <td><span className="mono" style={{ color: 'var(--acc)' }}>{v.id}</span></td>
                  <td><Pill s={v.tipo} /></td>
                  <td><b>{v.tracto}</b></td>
                  <td>{v.tipo === 'full' ? `${v.gondola1} + ${v.gondola2 || '?'}` : v.gondola1 || '-'}</td>
                  <td className="mono">{vM3(v)}</td>
                  <td className="mono">{v.km}</td>
                  <td style={{ fontSize: 10 }}>{v.estimacion_id || '—'}</td>
                  <td><Pill s={v.estado} /></td>
                  <td>{v.fecha_salida || '-'}</td>
                  <td>{v.hora_salida || '-'}</td>
                  <td>{v.eco || '-'}</td>
                  <td style={{ fontSize: 10 }}>{v.mina || '-'}</td>
                  <td>{v.fecha_llegada || '—'}</td>
                  <td>{v.hora_llegada || '—'}</td>
                  <td style={{ fontSize: 10 }}>{v.operador}</td>
                  <td className="mono" style={{ color: 'var(--cobro)' }}>{fmt(vCobro(v))}</td>
                  <td className="mono" style={{ color: 'var(--pago)' }}>{fmt(vPago(v))}</td>
                  <td className="mono" style={{ color: 'var(--util)' }}>{fmt(vUtil(v))}</td>
                  <td>
                    <span className={`pill ${v.foto_ticket_salida ? 'pg' : 'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>T.Sal</span>
                    <span className={`pill ${v.foto_tracto ? 'pg' : 'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>Tracto</span>
                    <span className={`pill ${v.foto_ticket_llegada ? 'pg' : 'pr'}`} style={{ fontSize: 8 }}>T.Lle</span>
                  </td>
                  <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    {v.estado === 'abierto' && p.canLlegada && (
                      <button className="btn btn-ok btn-xs" onClick={() => setLlegadaV(v)}>
                        <i className="ti ti-circle-check" />Llegada
                      </button>
                    )}
                    {v.estado === 'pendiente_pago' && p.canPagar && (
                      <button className="btn btn-xs" style={{ background: 'rgba(167,139,250,.15)', color: 'var(--util)', border: '1px solid rgba(167,139,250,.3)' }} onClick={() => setPagoV(v)}>
                        <i className="ti ti-cash" />Pagar
                      </button>
                    )}
                    {v.estado === 'cerrado' && p.canTodo && (
                      <button className="btn btn-danger btn-xs" onClick={() => reabrirViaje(v.id)}>
                        <i className="ti ti-lock-open" />
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={20} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Sin viajes con ese filtro</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {llegadaV && <ModalLlegada viaje={llegadaV} onClose={() => setLlegadaV(null)} onSaved={() => setLlegadaV(null)} />}
      {pagoV && <ModalPago viajes={[pagoV]} onClose={() => setPagoV(null)} onSaved={() => setPagoV(null)} />}
    </div>
  )
}
