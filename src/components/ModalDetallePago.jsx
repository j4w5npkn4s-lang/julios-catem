import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from './Pill'
import ModalDetalleViaje from './ModalDetalleViaje'

export default function ModalDetallePago({ pago, onClose }) {
  const { viajes, agremiados, pagos, vCobro, vPago, vM3, fmt, reabrirViaje } = useApp()
  const [detalleViaje, setDetalleViaje] = useState(null)

  if (!pago) return null

  // Si es pago masivo, buscar todos los pagos del mismo folio_masivo
  // Si es individual, solo ese viaje
  let viajesList = []
  let totalMonto = 0

  if (pago.masivo && pago.folio_masivo) {
    // Buscar todos los pagos con el mismo folio masivo
    const pagosGrupo = pagos.filter(p => p.folio_masivo === pago.folio_masivo)
    viajesList = pagosGrupo.map(p => ({
      viaje: viajes.find(v => v.id === p.viaje_id),
      monto: p.monto,
      parte: p.parte,
    })).filter(x => x.viaje)
    totalMonto = pagosGrupo.reduce((a, p) => a + (p.monto || 0), 0)
  } else {
    const v = viajes.find(v => v.id === pago.viaje_id)
    if (v) viajesList = [{ viaje: v, monto: pago.monto, parte: pago.parte }]
    totalMonto = pago.monto || 0
  }

  const agNombre = id => agremiados.find(a => a.id === id)?.nombre || '—'

  const totalM3  = viajesList.reduce((a, x) => a + vM3(x.viaje), 0)
  const totalCob = viajesList.reduce((a, x) => a + vCobro(x.viaje), 0)

  return (
    <>
      <div className="ov" onClick={e => e.target.classList.contains('ov') && onClose()}>
        <div className="modal" style={{ width: 620, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div className="mh">
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Detalle de pago</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {pago.masivo ? `Pago masivo · ${viajesList.length} viaje(s)` : 'Pago individual'}
              </div>
            </div>
            <button className="mx" onClick={onClose}>×</button>
          </div>

          {/* Info del pago */}
          <div style={{ padding: '14px 17px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Fecha de pago</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{pago.fecha || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Monto total pagado</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, fontWeight: 700, color: 'var(--ok)' }}>{fmt(totalMonto)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Folio / Referencia</div>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Mono',monospace" }}>{pago.folio || 'Sin folio'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Comprobante</div>
                {pago.comprobante_url
                  ? <a href={pago.comprobante_url} target="_blank" className="btn btn-ok btn-xs">
                      <i className="ti ti-file-invoice" />Ver comprobante
                    </a>
                  : <span style={{ fontSize: 11, color: 'var(--err)' }}>Sin comprobante</span>
                }
              </div>
            </div>
          </div>

          {/* Resumen viajes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '10px 17px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Viajes incluidos</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: 'var(--acc)' }}>{viajesList.length}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>M³ Total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: 'var(--info)' }}>{totalM3.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Cobro total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--cobro)' }}>{fmt(totalCob)}</div>
            </div>
          </div>

          {/* Lista de viajes */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '8px 17px 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Viajes incluidos en este pago
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 1 }}>
                <tr>
                  {['TICKET','TRACTO','TIPO','AGREMIADO','OPERADOR','M³','ORIGEN→DESTINO','MONTO PAGADO','FOTOS'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viajesList.length ? viajesList.map(({ viaje: v, monto }) => (
                  <tr key={v.id}
                    onClick={() => setDetalleViaje(v)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => e.currentTarget.style.background='var(--bg3)'}
                    onMouseOut={e  => e.currentTarget.style.background=''}>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--acc)', fontWeight: 700 }}>{v.id}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600 }}>{v.tracto}</td>
                    <td style={{ padding: '8px 10px' }}><Pill s={v.tipo} /></td>
                    <td style={{ padding: '8px 10px', fontSize: 10 }}>{agNombre(v.agremiado_id)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 10 }}>{v.operador}</td>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{vM3(v)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.origen||'—'} → {v.destino||'—'}</td>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--ok)', fontWeight: 700 }}>{fmt(monto)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`pill ${v.foto_ticket_salida?'pg':'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>T.S</span>
                      <span className={`pill ${v.foto_tracto?'pg':'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>Tr</span>
                      <span className={`pill ${v.foto_ticket_llegada?'pg':'pr'}`} style={{ fontSize: 8 }}>T.L</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Sin viajes asociados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mf">
            <button className="btn btn-out btn-sm" onClick={() => window.print()}>
              <i className="ti ti-printer" />Imprimir
            </button>
            <div style={{ flex: 1 }} />
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
