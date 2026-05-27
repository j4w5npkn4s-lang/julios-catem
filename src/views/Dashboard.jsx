import { useState } from 'react'
import ModalDetalleViaje from '../components/ModalDetalleViaje'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalLlegada from '../components/ModalLlegada'
import ModalPago from '../components/ModalPago'
import ModalConciliacion from '../components/ModalConciliacion'

export default function Dashboard({ onNewTicket, searchQ = '' }) {
  const { viajes, estimaciones, pagos, vCobro, vPago, vUtil, vM3, fmt, mandarAPago, perm } = useApp()
  const [tab, setTab] = useState('atencion')
  const [llegadaV, setLlegadaV] = useState(null)
  const [pagoVs, setPagoVs]     = useState(null)
  const [showConcil, setShowConcil] = useState(false)
  const [selPago, setSelPago]   = useState(new Set())
  const [detalleV, setDetalleV] = useState(null)

  const p = perm() || {}

  // DASH 1: REQUIEREN ATENCIÓN
  const conProblema = viajes.filter(v => {
    if (v.estado === 'cerrado') return false
    if (!(!v.foto_ticket_salida || !v.foto_tracto || v.estado === 'abierto' || !v.operador || v.operador === '—')) return false
    if (searchQ) {
      const sq = searchQ.toLowerCase()
      if (!(v.id + v.tracto + v.operador + (v.gondola1||'')).toLowerCase().includes(sq)) return false
    }
    return true
  })

  // DASH 2: PENDIENTES
  const pendConcil = viajes.filter(v => v.estado === 'pendiente_conciliar')
  const pendPago   = viajes.filter(v => v.estado === 'pendiente_pago')
  const tCobrar    = pendConcil.reduce((a, v) => a + vCobro(v), 0)
  const tPagar     = pendPago.reduce((a, v) => a + vPago(v), 0)

  // DASH 3: HISTÓRICO
  const totalCob  = viajes.reduce((a, v) => a + vCobro(v), 0)
  const totalPag  = viajes.reduce((a, v) => a + vPago(v), 0)
  const totalUtil = totalCob - totalPag
  const totalM3   = viajes.reduce((a, v) => a + vM3(v), 0)

  function toggleSelPago(id) {
    const s = new Set(selPago)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelPago(s)
  }

  function getProblemas(v) {
    const p = []
    if (!v.foto_ticket_salida) p.push('Sin T.Salida')
    if (!v.foto_tracto) p.push('Sin foto tracto')
    if (v.estado === 'abierto') p.push('Sin T.Llegada')
    if (!v.operador || v.operador === '—') p.push('Sin operador')
    return p
  }

  // Años para histórico
  const YEARS = [2026, 2025, 2024]
  const [histYear, setHistYear] = useState(2026)
  const estYear = estimaciones.filter(e => e.year === histYear)

  return (
    <div>
      <div className="dtabs">
        <button className={`dtab${tab==='atencion'?' active':''}`} onClick={() => setTab('atencion')}>
          ⚠️ Requieren atención {conProblema.length > 0 && <span style={{ background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: '1px 6px', marginLeft: 4, fontSize: 10 }}>{conProblema.length}</span>}
        </button>
        <button className={`dtab${tab==='pendientes'?' active':''}`} onClick={() => setTab('pendientes')}>
          📋 Pendientes {(pendConcil.length + pendPago.length) > 0 && <span style={{ background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: '1px 6px', marginLeft: 4, fontSize: 10 }}>{pendConcil.length + pendPago.length}</span>}
        </button>
        <button className={`dtab${tab==='historico'?' active':''}`} onClick={() => setTab('historico')}>📊 Histórico</button>
      </div>

      {/* ── REQUIEREN ATENCIÓN ── */}
      {tab === 'atencion' && (
        <div>
          <div className="kpis kpis-4">
            <div className="kpi orn"><div className="kpi-l">Con problemas</div><div className="kpi-v" style={{ color: 'var(--err)' }}>{conProblema.length}</div><div className="kpi-s">Total viajes</div></div>
            <div className="kpi"><div className="kpi-l">Sin foto tracto</div><div className="kpi-v" style={{ color: 'var(--err)' }}>{viajes.filter(v => !v.foto_tracto && v.estado !== 'cerrado').length}</div><div className="kpi-s">Pendiente</div></div>
            <div className="kpi"><div className="kpi-l">Sin ticket salida</div><div className="kpi-v" style={{ color: 'var(--warn)' }}>{viajes.filter(v => !v.foto_ticket_salida && v.estado !== 'cerrado').length}</div><div className="kpi-s">Pendiente</div></div>
            <div className="kpi"><div className="kpi-l">Sin ticket llegada</div><div className="kpi-v" style={{ color: 'var(--warn)' }}>{viajes.filter(v => v.estado === 'abierto').length}</div><div className="kpi-s">Viajes abiertos</div></div>
          </div>
          <div className="tc">
            <div className="tc-h"><span className="tc-t">Viajes que requieren atención</span></div>
            <div className="tw">
              <table>
                <thead><tr><th>TICKET ID</th><th>TIPO</th><th>TRACTO</th><th>M³</th><th>OPERADOR</th><th>FECHA SAL.</th><th>ESTADO</th><th>PROBLEMA</th><th>ACCIÓN</th></tr></thead>
                <tbody>
                  {conProblema.length ? conProblema.map(v => (
                    <tr key={v.id} className="tr" onClick={() => setDetalleV(v)}>
                      <td><span className="mono" style={{ color: 'var(--acc)' }}>{v.id}</span></td>
                      <td><Pill s={v.tipo} /></td>
                      <td>{v.tracto}</td>
                      <td className="mono">{vM3(v)}</td>
                      <td style={{ fontSize: 10 }}>{v.operador}</td>
                      <td>{v.fecha_salida || '—'}</td>
                      <td><Pill s={v.estado} /></td>
                      <td>{getProblemas(v).map(p => <span key={p} className="pill pr" style={{ marginRight: 3, fontSize: 9 }}>{p}</span>)}</td>
                      <td>
                        {v.estado === 'abierto' && p.canLlegada && (
                          <button className="btn btn-ok btn-xs" onClick={() => setLlegadaV(v)}>
                            <i className="ti ti-circle-check" />Llegada
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--ok)' }}>✓ Sin viajes con problemas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PENDIENTES ── */}
      {tab === 'pendientes' && (
        <div>
          <div className="kpis kpis-4">
            <div className="kpi grn"><div className="kpi-l">Por cobrar</div><div className="kpi-v">{fmt(tCobrar)}</div><div className="kpi-s">Pend. conciliar</div></div>
            <div className="kpi acc"><div className="kpi-l">Tickets pend. conciliar</div><div className="kpi-v">{pendConcil.length}</div><div className="kpi-s">Listos</div></div>
            <div className="kpi red"><div className="kpi-l">Por pagar camioneros</div><div className="kpi-v">{fmt(tPagar)}</div><div className="kpi-s">Sin liquidar</div></div>
            <div className="kpi pur"><div className="kpi-l">Tickets pend. pago</div><div className="kpi-v">{pendPago.length}</div><div className="kpi-s">Camioneros</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* PENDIENTES DE CONCILIAR */}
            <div className="tc">
              <div className="tc-h">
                <span className="tc-t">Pendientes de conciliar</span>
                {p.canConciliar && pendConcil.length > 0 && (
                  <button className="btn btn-acc btn-sm" onClick={() => setShowConcil(true)}>
                    <i className="ti ti-file-check" />Conciliar
                  </button>
                )}
              </div>
              <div className="tw">
                <table>
                  <thead><tr><th>TICKET</th><th>TRACTO</th><th>M³</th><th>COBRO</th><th>FECHA</th></tr></thead>
                  <tbody>
                    {pendConcil.length ? pendConcil.map(v => (
                      <tr key={v.id} className="tr" onClick={() => setDetalleV(v)}>
                        <td><span className="mono" style={{ color: 'var(--acc)' }}>{v.id}</span></td>
                        <td>{v.tracto}</td>
                        <td className="mono">{vM3(v)}</td>
                        <td className="mono" style={{ color: 'var(--cobro)' }}>{fmt(vCobro(v))}</td>
                        <td>{v.fecha_salida || '—'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 16, color: 'var(--muted)' }}>Sin pendientes ✓</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PENDIENTES DE PAGO */}
            <div className="tc">
              <div className="tc-h">
                <span className="tc-t">Pendientes de pago</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {selPago.size > 0 && p.canPagar && (
                    <button className="btn btn-ok btn-sm" onClick={() => setPagoVs(pendPago.filter(v => selPago.has(v.id)))}>
                      <i className="ti ti-cash" />Pagar ({selPago.size})
                    </button>
                  )}
                  {pendPago.length > 0 && p.canPagar && (
                    <button className="btn btn-acc btn-sm" onClick={() => setPagoVs(pendPago)}>
                      <i className="ti ti-cash" />Pago masivo
                    </button>
                  )}
                </div>
              </div>
              <div className="tw">
                <table>
                  <thead><tr><th></th><th>TICKET</th><th>OPERADOR</th><th>M³</th><th>A PAGAR</th><th>FECHA</th></tr></thead>
                  <tbody>
                    {pendPago.length ? pendPago.map(v => (
                      <tr key={v.id} className="tr" onClick={() => setDetalleV(v)}>
                        <td><input type="checkbox" checked={selPago.has(v.id)} onChange={() => toggleSelPago(v.id)} style={{ accentColor: 'var(--acc)' }} /></td>
                        <td><span className="mono" style={{ color: 'var(--acc)' }}>{v.id}</span></td>
                        <td style={{ fontSize: 10 }}>{v.operador}</td>
                        <td className="mono">{vM3(v)}</td>
                        <td className="mono" style={{ color: 'var(--pago)' }}>{fmt(vPago(v))}</td>
                        <td>{v.fecha_salida || '—'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16, color: 'var(--muted)' }}>Sin pendientes ✓</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab === 'historico' && (
        <div>
          <div className="kpis kpis-4">
            <div className="kpi acc"><div className="kpi-l">Total viajes</div><div className="kpi-v">{viajes.length}</div><div className="kpi-s">{totalM3.toFixed(0)} m³</div></div>
            <div className="kpi grn"><div className="kpi-l">Cobros totales</div><div className="kpi-v">{fmt(totalCob)}</div><div className="kpi-s">Todos los viajes</div></div>
            <div className="kpi red"><div className="kpi-l">Pagos totales</div><div className="kpi-v">{fmt(totalPag)}</div><div className="kpi-s">Camioneros</div></div>
            <div className="kpi pur"><div className="kpi-l">Utilidad total</div><div className="kpi-v">{fmt(totalUtil)}</div><div className="kpi-s">Cobro − Pago</div></div>
          </div>
          <div className="split">
            <div className="spi"><div className="spl">CATEM (50%)</div><div className="spv">{fmt(totalUtil/2)}</div></div>
            <div className="spi" style={{ borderLeft: '1px solid var(--border)' }}><div className="spl">Julios Sánchez Vargas (50%)</div><div className="spv">{fmt(totalUtil/2)}</div></div>
          </div>
          {/* Por año */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 12, flexWrap: 'wrap' }}>
            {YEARS.map(y => (
              <button key={y} className={`ychip${histYear===y?' active':''}`} onClick={() => setHistYear(y)}>{y}</button>
            ))}
          </div>
          <div className="est-grid">
            {estYear.map(e => {
              const vs = viajes.filter(v => v.estimacion_id === e.id)
              const m3 = vs.reduce((a, v) => a + vM3(v), 0)
              const cob = vs.reduce((a, v) => a + vCobro(v), 0)
              const pag = vs.reduce((a, v) => a + vPago(v), 0)
              return (
                <div key={e.id} className={`ec ${e.estado}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>{e.id}</div>
                    <Pill s={e.estado} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{vs.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, marginBottom: 6 }}>{m3.toFixed(2)} m³</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--cobro)' }}>{fmt(cob)}</div>
                  <div style={{ fontSize: 11, color: 'var(--util)', marginTop: 2 }}>Util: {fmt(cob-pag)}</div>
                </div>
              )
            })}
            {!estYear.length && <div className="empty" style={{ gridColumn: '1/-1' }}><i className="ti ti-file-invoice" /><p>Sin estimaciones para {histYear}</p></div>}
          </div>
        </div>
      )}

      {/* MODALES */}
      {detalleV && <ModalDetalleViaje viaje={detalleV} onClose={() => setDetalleV(null)} onReabrir={id => { reabrirViaje(id); setDetalleV(null) }} />}
      {llegadaV && <ModalLlegada viaje={llegadaV} onClose={() => setLlegadaV(null)} onSaved={() => setLlegadaV(null)} />}
      {pagoVs && <ModalPago viajes={pagoVs} onClose={() => { setPagoVs(null); setSelPago(new Set()) }} onSaved={() => { setPagoVs(null); setSelPago(new Set()) }} />}
      {showConcil && <ModalConciliacion onClose={() => setShowConcil(false)} onSaved={() => setShowConcil(false)} />}
    </div>
  )
}
