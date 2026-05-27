import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from './Pill'
import ModalDetalleViaje from './ModalDetalleViaje'

export default function ModalViajesAgremiado({ agremiado, onClose }) {
  const { viajes, vCobro, vPago, vM3, fmt, reabrirViaje } = useApp()
  const [detalleViaje, setDetalleViaje] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')

  const vs = viajes.filter(v => v.agremiado_id === agremiado.id)
  const filtered = filtroEstado ? vs.filter(v => v.estado === filtroEstado) : vs

  const totalM3  = filtered.reduce((a,v) => a + vM3(v), 0)
  const totalCob = filtered.reduce((a,v) => a + vCobro(v), 0)
  const totalPag = filtered.reduce((a,v) => a + vPago(v), 0)

  function exportarExcel() {
    // Simple CSV export
    const headers = ['Ticket ID','Tipo','Tracto','Gondola 1','Gondola 2','M³','KM','Origen','Destino','Operador','Fecha Salida','Fecha Llegada','Estado','Cobro','Pago']
    const rows = filtered.map(v => [
      v.id, v.tipo, v.tracto, v.gondola1, v.gondola2||'', vM3(v), v.km,
      v.origen||'', v.destino||'', v.operador, v.fecha_salida||'', v.fecha_llegada||'',
      v.estado, vCobro(v), vPago(v)
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `viajes-${agremiado.nombre.replace(/\s+/g,'-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function imprimir() {
    window.print()
  }

  return (
    <>
      <div className="ov" onClick={e => e.target.classList.contains('ov') && onClose()}>
        <div className="modal" style={{ width: 780, maxWidth: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="mh">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{agremiado.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {agremiado.telefono && <span><i className="ti ti-phone" style={{ fontSize: 10, marginRight: 3 }} />{agremiado.telefono} · </span>}
                {vs.length} viajes registrados
              </div>
            </div>
            <button className="mx" onClick={onClose}>×</button>
          </div>

          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '10px 17px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Viajes</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, fontWeight: 700, color: 'var(--acc)' }}>{filtered.length}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>M³ Total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: 'var(--info)' }}>{totalM3.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Cobro total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--cobro)' }}>{fmt(totalCob)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Pago total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--pago)' }}>{fmt(totalPag)}</div>
            </div>
          </div>

          {/* Filtros y acciones */}
          <div style={{ display: 'flex', gap: 8, padding: '10px 17px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              style={{ height: 30, fontSize: 11, padding: '0 8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }}>
              <option value="">Todos los estados</option>
              <option value="abierto">Abierto</option>
              <option value="pendiente_conciliar">Pend. conciliar</option>
              <option value="pendiente_pago">Pend. pago</option>
              <option value="cerrado">Cerrado</option>
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn-out btn-sm" onClick={exportarExcel}>
              <i className="ti ti-table-export" />Exportar CSV
            </button>
            <button className="btn btn-out btn-sm" onClick={imprimir}>
              <i className="ti ti-printer" />Imprimir
            </button>
          </div>

          {/* Tabla */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>TICKET</th>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>TRACTO</th>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>TIPO</th>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>M³</th>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>ORIGEN→DESTINO</th>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>FECHA SAL.</th>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>COBRO</th>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>ESTADO</th>
                  <th style={{ padding: '7px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>FOTOS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map(v => (
                  <tr key={v.id} onClick={() => setDetalleViaje(v)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => e.currentTarget.style.background='var(--bg3)'}
                    onMouseOut={e  => e.currentTarget.style.background=''}>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--acc)', fontWeight: 700 }}>{v.id}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600 }}>{v.tracto}</td>
                    <td style={{ padding: '8px 10px' }}><Pill s={v.tipo} /></td>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{vM3(v)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--muted)' }}>{v.origen||'—'} → {v.destino||'—'}</td>
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
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Sin viajes</td></tr>
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
