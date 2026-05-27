import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from './Pill'
import ModalDetalleViaje from './ModalDetalleViaje'

export default function ModalDetalleCamion({ camion: c, onClose }) {
  const { viajes, agremiados, vCobro, vPago, vM3, fmt, reabrirViaje } = useApp()
  const [detalleViaje, setDetalleViaje] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')

  const agNombre = agremiados.find(a => a.id === c.agremiado_id)?.nombre || '—'

  // Viajes de este camión
  const vs = viajes.filter(v => v.tracto === c.placa_tracto)
  const filtered = filtroEstado ? vs.filter(v => v.estado === filtroEstado) : vs

  const totalM3  = filtered.reduce((a,v) => a + vM3(v), 0)
  const totalCob = filtered.reduce((a,v) => a + vCobro(v), 0)
  const totalPag = filtered.reduce((a,v) => a + vPago(v), 0)

  // Auto-status
  const hoy = new Date()
  const activo = c.ultimo_viaje && (hoy - new Date(c.ultimo_viaje)) / (1000*60*60*24) <= 7

  function exportarCSV() {
    const headers = ['Ticket ID','Tipo','M³','KM','Origen','Destino','Operador','Fecha Salida','Fecha Llegada','Estado','Cobro','Pago']
    const rows = filtered.map(v => [
      v.id, v.tipo, vM3(v), v.km, v.origen||'', v.destino||'',
      v.operador, v.fecha_salida||'', v.fecha_llegada||'', v.estado, vCobro(v), vPago(v)
    ])
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`historial-${c.placa_tracto}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="ov" onClick={e => e.target.classList.contains('ov') && onClose()}>
        <div className="modal" style={{ width: 720, maxWidth: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="mh">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {c.foto_tracto_url
                ? <img src={c.foto_tracto_url} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                : <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-truck" style={{ fontSize: 24, color: 'var(--muted)' }} />
                  </div>
              }
              <div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: 'var(--acc)' }}>{c.placa_tracto}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <Pill s={c.tipo} />
                  <span className={`pill ${activo ? 'pg' : 'pr'}`}>{activo ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Agremiado: <b>{agNombre}</b></div>
              </div>
            </div>
            <button className="mx" onClick={onClose}>×</button>
          </div>

          {/* Datos del camión */}
          <div style={{ padding: '10px 17px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11 }}>
            <div><span style={{ color: 'var(--muted)' }}>Gondola 1: </span><b style={{ fontFamily: "'Space Mono',monospace" }}>{c.placa_gondola1 || '—'}</b> <span style={{ color: 'var(--muted)' }}>({c.m3_gondola1} m³)</span></div>
            {c.tipo === 'full' && <div><span style={{ color: 'var(--muted)' }}>Gondola 2: </span><b style={{ fontFamily: "'Space Mono',monospace" }}>{c.placa_gondola2 || '—'}</b> <span style={{ color: 'var(--muted)' }}>({c.m3_gondola2} m³)</span></div>}
            <div><span style={{ color: 'var(--muted)' }}>Último viaje: </span><b>{c.ultimo_viaje || 'Sin viajes'}</b></div>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '10px 17px', borderBottom: '1px solid var(--border)' }}>
            {[
              { label: 'Viajes', val: filtered.length, color: 'var(--acc)' },
              { label: 'M³ Total', val: totalM3.toFixed(2), color: 'var(--info)' },
              { label: 'Cobro total', val: fmt(totalCob), color: 'var(--cobro)' },
              { label: 'Pago total', val: fmt(totalPag), color: 'var(--pago)' },
            ].map(k => (
              <div key={k.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 15, fontWeight: 700, color: k.color, marginTop: 2 }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, padding: '8px 17px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              style={{ height: 30, fontSize: 11, padding: '0 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
              <option value="">Todos los estados</option>
              <option value="abierto">Abierto</option>
              <option value="pendiente_conciliar">Pend. conciliar</option>
              <option value="pendiente_pago">Pend. pago</option>
              <option value="cerrado">Cerrado</option>
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn-out btn-sm" onClick={exportarCSV}><i className="ti ti-table-export" />Exportar CSV</button>
            <button className="btn btn-out btn-sm" onClick={() => window.print()}><i className="ti ti-printer" />Imprimir</button>
          </div>

          {/* Tabla viajes */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
                <tr>
                  {['TICKET','TIPO','M³','ORIGEN→DESTINO','OPERADOR','FECHA SAL.','COBRO','ESTADO','FOTOS'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map(v => (
                  <tr key={v.id} onClick={() => setDetalleViaje(v)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => e.currentTarget.style.background='var(--bg3)'}
                    onMouseOut={e  => e.currentTarget.style.background=''}>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--acc)', fontWeight: 700 }}>{v.id}</td>
                    <td style={{ padding: '8px 10px' }}><Pill s={v.tipo} /></td>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{vM3(v)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.origen||'—'} → {v.destino||'—'}</td>
                    <td style={{ padding: '8px 10px', fontSize: 10 }}>{v.operador}</td>
                    <td style={{ padding: '8px 10px', fontSize: 10 }}>{v.fecha_salida||'—'}</td>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--cobro)' }}>{fmt(vCobro(v))}</td>
                    <td style={{ padding: '8px 10px' }}><Pill s={v.estado} /></td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`pill ${v.foto_ticket_salida?'pg':'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>T.S</span>
                      <span className={`pill ${v.foto_tracto?'pg':'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>Tr</span>
                      <span className={`pill ${v.foto_ticket_llegada?'pg':'pr'}`} style={{ fontSize: 8 }}>T.L</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Sin viajes registrados para este camión</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mf">
            <button className="btn btn-out" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>

      {detalleViaje && (
        <ModalDetalleViaje
          viaje={detalleViaje}
          onClose={() => setDetalleViaje(null)}
          onReabrir={id => { reabrirViaje(id); setDetalleViaje(null) }}
        />
      )}
    </>
  )
}
