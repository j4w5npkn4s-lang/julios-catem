import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { supabase } from '../lib/supabase'
import Pill from '../components/Pill'
import ModalConciliacion from '../components/ModalConciliacion'
import FotoSlot from '../components/FotoSlot'
import { useToast } from '../components/Toast'

export default function ViewConciliaciones() {
  const { conciliaciones, viajes, vCobro, vPago, vM3, fmt, cerrarConciliacion, quitarViajeConciliacion, reabrirViaje, uploadFoto, perm } = useApp()
  const toast = useToast()
  const [showNew, setShowNew]   = useState(false)
  const [podFile, setPodFile]   = useState({})
  const [closing, setClosing]   = useState(null)

  const p = perm() || {}

  async function handleCerrar(c) {
    try {
      setClosing(c.id)
      let podUrl = c.pod_url
      if (podFile[c.id]) podUrl = await uploadFoto(podFile[c.id], `pods/${c.id}`)
      await cerrarConciliacion(c.id, podUrl)
      toast(`Conciliación ${c.id} cerrada ✓`, 'ok')
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setClosing(null)
    }
  }

  async function handleQuitarViaje(concilId, viajeId) {
    try {
      await quitarViajeConciliacion(concilId, viajeId)
      toast('Viaje removido de la conciliación', 'ok')
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  // Get viajes for a conciliacion
  function getConcilViajes(c) {
    const ids = c.conciliacion_viajes?.map(cv => cv.viaje_id) || []
    return viajes.filter(v => ids.includes(v.id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 11 }}>
        {p.canConciliar && (
          <button className="btn btn-acc btn-sm" onClick={() => setShowNew(true)}>
            <i className="ti ti-plus" />Nueva conciliación
          </button>
        )}
      </div>

      {conciliaciones.length === 0 ? (
        <div className="empty"><i className="ti ti-file-check" /><p>Sin conciliaciones</p></div>
      ) : conciliaciones.map(c => {
        const vs = getConcilViajes(c)
        const tCob = vs.reduce((a, v) => a + vCobro(v), 0)
        const tPag = vs.reduce((a, v) => a + vPago(v), 0)
        const tUtil = tCob - tPag

        return (
          <div key={c.id} style={{ background: 'var(--bg2)', border: `1px solid ${c.estado === 'cerrada' ? 'rgba(34,197,94,.3)' : 'rgba(245,158,11,.3)'}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'var(--bg3)', padding: '12px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>{c.id} · {c.descripcion}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  {c.fecha} · {vs.length} viaje(s)
                  {c.estimacion_id && ` · Est. ${c.estimacion_id}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <Pill s={c.estado} />
                {c.pod_url ? <span className="pill pg">✓ POD</span> : <span className="pill pr">Sin POD</span>}
                {c.estado === 'abierta' && p.canConciliar && (
                  <button className="btn btn-ok btn-sm" onClick={() => handleCerrar(c)} disabled={closing === c.id}>
                    <i className="ti ti-lock" />{closing === c.id ? 'Cerrando...' : 'Cerrar conciliación'}
                  </button>
                )}
                {c.estado === 'cerrada' && p.canTodo && (
                  <button className="btn btn-danger btn-xs" onClick={async () => {
                    try {
                      await supabase.from('conciliaciones').update({ estado: 'abierta' }).eq('id', c.id)
                      toast('Conciliación reabierta', 'warn')
                    } catch (err) { toast(err.message, 'err') }
                  }}>
                    <i className="ti ti-lock-open" />Reabrir
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '12px 15px' }}>
              {/* Totales */}
              <div style={{ display: 'flex', gap: 18, fontSize: 11, marginBottom: 10, flexWrap: 'wrap' }}>
                <div><span style={{ color: 'var(--muted)' }}>Cobro: </span><span className="mono" style={{ color: 'var(--cobro)' }}>{fmt(tCob)}</span></div>
                <div><span style={{ color: 'var(--muted)' }}>Pago: </span><span className="mono" style={{ color: 'var(--pago)' }}>{fmt(tPag)}</span></div>
                <div><span style={{ color: 'var(--muted)' }}>Utilidad: </span><span className="mono" style={{ color: 'var(--util)' }}>{fmt(tUtil)}</span></div>
                {c.precio_total && <div><span style={{ color: 'var(--muted)' }}>Precio negociado: </span><span className="mono" style={{ color: 'var(--acc)' }}>{fmt(c.precio_total)}</span></div>}
              </div>

              {/* POD upload si abierta */}
              {c.estado === 'abierta' && !c.pod_url && p.canConciliar && (
                <div style={{ marginBottom: 10 }}>
                  <FotoSlot label="Subir POD firmado (PDF o imagen)" icon="file-type-pdf" accept="application/pdf,image/*"
                    onCapture={f => setPodFile(prev => ({ ...prev, [c.id]: f }))}
                    done={!!podFile[c.id]} />
                </div>
              )}

              {/* Tabla de viajes */}
              <div className="tw">
                <table style={{ fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg3)' }}>
                      <th>TICKET</th><th>TRACTO</th><th>TIPO</th><th>M³</th><th>KM</th>
                      <th>COBRO</th><th>PAGO</th><th>ESTADO</th>
                      {c.estado === 'abierta' && p.canConciliar && <th>QUITAR</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vs.map(v => (
                      <tr key={v.id}>
                        <td><span className="mono" style={{ color: 'var(--acc)' }}>{v.id}</span></td>
                        <td>{v.tracto}</td>
                        <td><Pill s={v.tipo} /></td>
                        <td className="mono">{vM3(v)}</td>
                        <td className="mono">{v.km}</td>
                        <td className="mono" style={{ color: 'var(--cobro)' }}>{fmt(vCobro(v))}</td>
                        <td className="mono" style={{ color: 'var(--pago)' }}>{fmt(vPago(v))}</td>
                        <td><Pill s={v.estado} /></td>
                        {c.estado === 'abierta' && p.canConciliar && (
                          <td>
                            <button className="btn btn-danger btn-xs" onClick={() => handleQuitarViaje(c.id, v.id)} title="Quitar de la conciliación">
                              <i className="ti ti-x" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })}

      {showNew && <ModalConciliacion onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />}
    </div>
  )
}
