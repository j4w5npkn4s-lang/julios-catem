import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalDetalleViaje from '../components/ModalDetalleViaje'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'

// Calcula horas desde salida
function horasDesde(fechaSalida, horaSalida) {
  if (!fechaSalida) return null
  const salidaStr = fechaSalida + (horaSalida ? 'T' + horaSalida : 'T00:00')
  const salida = new Date(salidaStr)
  const ahora  = new Date()
  return (ahora - salida) / (1000 * 60 * 60)
}

// Semáforo de retraso
function getSemaforo(v) {
  if (v.incidente === 'accidente') return { color: '#EF4444', bg: 'rgba(239,68,68,.15)', label: '🚨 Accidentado', nivel: 4 }
  if (v.incidente === 'robo')      return { color: '#EF4444', bg: 'rgba(239,68,68,.15)', label: '🚨 Robado',      nivel: 4 }
  if (v.fecha_llegada)             return { color: '#22C55E', bg: 'rgba(34,197,94,.1)',  label: '✓ Entregado',   nivel: 0 }
  if (v.estado !== 'abierto')      return { color: '#22C55E', bg: 'rgba(34,197,94,.1)',  label: '✓ Llegó',       nivel: 0 }

  const horas = horasDesde(v.fecha_salida, v.hora_salida)
  if (horas === null) return { color: '#8A8F9E', bg: 'var(--bg3)', label: 'En ruta', nivel: 1 }

  if (horas < 24)         return { color: '#22C55E', bg: 'rgba(34,197,94,.1)',    label: '🟢 En ruta',          nivel: 1 }
  if (horas < 48)         return { color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  label: '🟡 Retraso leve',     nivel: 2 }
  if (horas < 168)        return { color: '#F97316', bg: 'rgba(249,115,22,.12)',  label: '🟠 Retraso de riesgo',nivel: 3 }
  return                          { color: '#EF4444', bg: 'rgba(239,68,68,.15)',  label: '🔴 Alta gravedad',    nivel: 4 }
}

export default function DashboardRuta() {
  const { viajes, updateViaje, perm } = useApp()
  const toast = useToast()
  const p = perm()
  const [detalleV, setDetalleV]     = useState(null)
  const [incidenteV, setIncidenteV] = useState(null)
  const [motivo, setMotivo]         = useState('')
  const [tipoInc, setTipoInc]       = useState('accidente')
  const [filtro, setFiltro]         = useState('todos')

  // Solo viajes abiertos (en ruta) + accidentados/robados
  const enRuta = viajes.filter(v =>
    (v.estado === 'abierto' || v.incidente) && v.estado !== 'cerrado'
  )

  const filtrados = filtro === 'todos' ? enRuta : enRuta.filter(v => {
    const s = getSemaforo(v)
    if (filtro === 'en_ruta')    return s.nivel === 1
    if (filtro === 'leve')       return s.nivel === 2
    if (filtro === 'riesgo')     return s.nivel === 3
    if (filtro === 'grave')      return s.nivel === 4 && !v.incidente
    if (filtro === 'incidente')  return !!v.incidente
    return true
  }).sort((a,b) => getSemaforo(b).nivel - getSemaforo(a).nivel)

  // Conteos
  const counts = {
    en_ruta:   enRuta.filter(v => getSemaforo(v).nivel === 1).length,
    leve:      enRuta.filter(v => getSemaforo(v).nivel === 2).length,
    riesgo:    enRuta.filter(v => getSemaforo(v).nivel === 3).length,
    grave:     enRuta.filter(v => getSemaforo(v).nivel === 4 && !v.incidente).length,
    incidente: enRuta.filter(v => !!v.incidente).length,
  }

  async function marcarIncidente() {
    if (!incidenteV) return
    try {
      await updateViaje(incidenteV.id, {
        incidente: tipoInc,
        incidente_notas: motivo,
        estado: 'cerrado',
      })
      toast(`Viaje ${incidenteV.id} marcado como ${tipoInc}`, 'warn')
      setIncidenteV(null); setMotivo('')
    } catch (err) { toast(err.message, 'err') }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>🚛 Viajes en Ruta</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{enRuta.length} camiones activos</div>
      </div>

      {/* KPIs semáforo */}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 14 }}>
        {[
          { key: 'en_ruta',  color: '#22C55E', label: '🟢 En ruta',           count: counts.en_ruta },
          { key: 'leve',     color: '#F59E0B', label: '🟡 Retraso leve',      count: counts.leve },
          { key: 'riesgo',   color: '#F97316', label: '🟠 Riesgo',            count: counts.riesgo },
          { key: 'grave',    color: '#EF4444', label: '🔴 Alta gravedad',     count: counts.grave },
          { key: 'incidente',color: '#EF4444', label: '🚨 Incidentes',        count: counts.incidente },
        ].map(k => (
          <div key={k.key} className="kpi clickable" style={{ borderLeft: `3px solid ${k.color}`, cursor:'pointer' }}
            onClick={() => setFiltro(filtro === k.key ? 'todos' : k.key)}>
            <div className="kpi-l">{k.label}</div>
            <div className="kpi-v" style={{ color: k.color, fontSize: 28 }}>{k.count}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="tc">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>TICKET</th><th>TRACTO</th><th>TIPO</th><th>OPERADOR</th>
                <th>ORIGEN</th><th>DESTINO</th><th>M³</th>
                <th>SALIDA</th><th>HORAS</th><th>ESTADO RUTA</th>
                {p.canTodo && <th>ACCIÓN</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.length ? filtrados.map(v => {
                const s     = getSemaforo(v)
                const horas = horasDesde(v.fecha_salida, v.hora_salida)
                const hStr  = horas !== null ? (horas < 24 ? `${Math.round(horas)}h` : `${Math.round(horas/24)}d ${Math.round(horas%24)}h`) : '—'
                return (
                  <tr key={v.id} className="tr" onClick={() => setDetalleV(v)}
                    style={{ borderLeft: `3px solid ${s.color}` }}>
                    <td><span className="mono" style={{ color: 'var(--acc)', fontWeight: 700 }}>{v.id}</span>
                      {v.folio2 && <div className="mono" style={{ fontSize: 9, color: 'var(--muted)' }}>{v.folio2}</div>}
                    </td>
                    <td><b>{v.tracto}</b></td>
                    <td><Pill s={v.tipo} /></td>
                    <td style={{ fontSize: 10 }}>{v.operador}</td>
                    <td style={{ fontSize: 10 }}>{v.origen || '—'}</td>
                    <td style={{ fontSize: 10 }}>{v.destino || '—'}</td>
                    <td className="mono">{(v.m3_1||0)+(v.m3_2||0)}</td>
                    <td style={{ fontSize: 10 }}>{v.fecha_salida} {v.hora_salida}</td>
                    <td className="mono" style={{ color: s.color, fontWeight: 700 }}>{hStr}</td>
                    <td>
                      <span style={{ background: s.bg, color: s.color, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                      {v.incidente_notas && <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{v.incidente_notas}</div>}
                    </td>
                    {p.canTodo && (
                      <td onClick={e => e.stopPropagation()}>
                        {!v.incidente && (
                          <button className="btn btn-danger btn-xs" onClick={() => { setIncidenteV(v); setTipoInc('accidente'); setMotivo('') }}>
                            <i className="ti ti-alert-triangle" />Incidente
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              }) : (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                  {filtro === 'todos' ? '✓ Sin camiones en ruta' : 'Sin viajes con ese filtro'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalle */}
      {detalleV && <ModalDetalleViaje viaje={detalleV} onClose={() => setDetalleV(null)} />}

      {/* Modal incidente */}
      {incidenteV && (
        <Modal title={`Reportar incidente · ${incidenteV.id}`} onClose={() => setIncidenteV(null)}
          footer={<>
            <button className="btn btn-out" onClick={() => setIncidenteV(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={marcarIncidente}>
              <i className="ti ti-alert-triangle" />Confirmar incidente
            </button>
          </>}>
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 7, padding: '10px 13px', marginBottom: 14, fontSize: 11 }}>
            <b>Tracto {incidenteV.tracto}</b> · {incidenteV.operador}<br />
            <span style={{ color: 'var(--muted)' }}>Este viaje quedará cancelado — no se cobrará ni se pagará</span>
          </div>
          <div className="fg">
            <label>Tipo de incidente</label>
            <div className="tipo-sel">
              <div className={`tipo-btn${tipoInc==='accidente'?' sel':''}`} onClick={() => setTipoInc('accidente')}>
                <i className="ti ti-car-crash" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>Accidente</div>
              </div>
              <div className={`tipo-btn${tipoInc==='robo'?' sel':''}`} onClick={() => setTipoInc('robo')}>
                <i className="ti ti-shield-off" style={{ fontSize: 24, display: 'block', marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>Robo</div>
              </div>
            </div>
          </div>
          <div className="fg">
            <label>Descripción / Notas</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
              placeholder="Describe lo que ocurrió..." />
          </div>
        </Modal>
      )}
    </div>
  )
}
