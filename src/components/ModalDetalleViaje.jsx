import { useApp } from '../lib/AppContext'
import Pill from './Pill'

export default function ModalDetalleViaje({ viaje: v, onClose, onReabrir }) {
  const { vCobro, vPago, vUtil, vM3, fmt, pagos, agremiados, perm } = useApp()
  const p = perm()

  if (!v) return null

  const pagosList = pagos.filter(pg => pg.viaje_id === v.id)
  const totalPagado = pagosList.reduce((a, pg) => a + (pg.monto || 0), 0)
  const agNombre = agremiados.find(a => a.id === v.agremiado_id)?.nombre || '—'

  const InfoRow = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || 'var(--text)', fontFamily: label.includes('$') || label.includes('M³') || label.includes('KM') ? "'Space Mono',monospace" : 'inherit' }}>{value || '—'}</span>
    </div>
  )

  return (
    <div className="ov" onClick={e => e.target.classList.contains('ov') && onClose()}>
      <div className="modal" style={{ width: 580, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="mh">
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--acc)' }}>{v.id}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <Pill s={v.tipo} />
              <Pill s={v.estado} />
            </div>
          </div>
          <button className="mx" onClick={onClose}>×</button>
        </div>

        <div className="mb">
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>M³ Total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: 'var(--info)' }}>{vM3(v)}</div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Cobro</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: 'var(--cobro)' }}>{fmt(vCobro(v))}</div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Pago camp.</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: 'var(--pago)' }}>{fmt(vPago(v))}</div>
            </div>
          </div>

          {/* Datos del viaje */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="sdv">Unidad</div>
              <InfoRow label="Tracto" value={v.tracto} />
              <InfoRow label="Gondola 1" value={v.gondola1} />
              {v.tipo === 'full' && <InfoRow label="Gondola 2" value={v.gondola2} />}
              <InfoRow label="M³ G1" value={v.m3_1} />
              {v.tipo === 'full' && <InfoRow label="M³ G2" value={v.m3_2} />}
              <InfoRow label="Agremiado" value={agNombre} />
              <InfoRow label="Operador" value={v.operador} />
            </div>
            <div>
              <div className="sdv">Ruta</div>
              <InfoRow label="Origen" value={v.origen} />
              <InfoRow label="Destino" value={v.destino} />
              <InfoRow label="KM" value={v.km} />
              <InfoRow label="Material" value={v.material} />
              <div className="sdv" style={{ marginTop: 10 }}>Fechas</div>
              <InfoRow label="Salida" value={`${v.fecha_salida || '—'} ${v.hora_salida || ''}`} />
              <InfoRow label="Llegada" value={`${v.fecha_llegada || '—'} ${v.hora_llegada || ''}`} />
            </div>
          </div>

          {/* Fotos */}
          <div className="sdv" style={{ marginTop: 10 }}>Documentos y fotos</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { label: 'Ticket salida', ok: v.foto_ticket_salida, url: v.foto_ticket_salida_url },
              { label: 'Foto tracto',   ok: v.foto_tracto,        url: v.foto_tracto_url },
              { label: 'Ticket llegada',ok: v.foto_ticket_llegada,url: v.foto_ticket_llegada_url },
            ].map(f => (
              <div key={f.label} style={{ flex: 1, minWidth: 120, background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${f.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}` }}>
                <i className={`ti ti-${f.ok ? 'circle-check' : 'circle-x'}`} style={{ color: f.ok ? 'var(--ok)' : 'var(--err)', fontSize: 16, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600 }}>{f.label}</div>
                  {f.url
                    ? <a href={f.url} target="_blank" style={{ fontSize: 9, color: 'var(--info)' }}>Ver foto →</a>
                    : <div style={{ fontSize: 9, color: 'var(--muted)' }}>Sin foto</div>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Pagos */}
          {pagosList.length > 0 && (
            <>
              <div className="sdv">Pagos registrados</div>
              {pagosList.map(pg => (
                <div key={pg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                  <span style={{ color: 'var(--muted)' }}>{pg.fecha}</span>
                  <span>{pg.folio || 'Sin folio'}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--ok)' }}>{fmt(pg.monto)}</span>
                  {pg.comprobante_url && <a href={pg.comprobante_url} target="_blank" style={{ fontSize: 10, color: 'var(--info)' }}>Comprobante</a>}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, fontWeight: 700, padding: '7px 0', color: 'var(--ok)', fontFamily: "'Space Mono',monospace" }}>
                Total pagado: {fmt(totalPagado)}
              </div>
            </>
          )}

          {/* Notas */}
          {v.notas && (
            <>
              <div className="sdv">Notas</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', padding: '6px 0' }}>{v.notas}</div>
            </>
          )}
        </div>

        <div className="mf">
          {v.estado === 'cerrado' && p.canTodo && onReabrir && (
            <button className="btn btn-danger btn-sm" onClick={() => { onReabrir(v.id); onClose() }}>
              <i className="ti ti-lock-open" />Reabrir viaje
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-out" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
