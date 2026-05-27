import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalLlegada from '../components/ModalLlegada'

export default function HomeAuxContador() {
  const { user, viajes, today } = useApp()
  const [q, setQ]               = useState('')
  const [llegadaViaje, setLleg]  = useState(null)

  const hora    = new Date().getHours()
  const saludo  = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre  = user?.nombre?.split(' ')[0] || ''

  const abiertos   = viajes.filter(v => v.estado === 'abierto')
  const conLlegada = viajes.filter(v => v.estado === 'pendiente_conciliar' && v.fecha_llegada)

  const resultados = (!q || q.length < 2)
    ? abiertos.slice(0, 20)
    : viajes.filter(v =>
        v.estado === 'abierto' &&
        (v.id + v.tracto + v.operador + (v.gondola1 || '')).toLowerCase().includes(q.toLowerCase())
      ).slice(0, 10)

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 20 }}>
      {/* Saludo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{saludo}, {nombre}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Aux. Contador · Registro de llegadas</div>
      </div>

      {/* KPIs */}
      <div className="kpis kpis-2" style={{ marginBottom: 16 }}>
        <div className="kpi orn">
          <div className="kpi-l">Viajes abiertos</div>
          <div className="kpi-v acc">{abiertos.length}</div>
          <div className="kpi-s">Esperando ticket llegada</div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Con llegada registrada</div>
          <div className="kpi-v" style={{ color: 'var(--ok)' }}>{conLlegada.length}</div>
          <div className="kpi-s">Listos hoy</div>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="tc" style={{ marginBottom: 14 }}>
        <div className="tc-h"><span className="tc-t">Buscar viaje para registrar llegada</span></div>
        <div style={{ padding: '10px 13px' }}>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Ticket ID, placa del tracto, operador..."
            style={{ height: 40, fontSize: 13 }}
            autoFocus
          />
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {resultados.length ? resultados.map(v => (
            <div key={v.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
              onClick={() => setLleg(v)}
              onMouseOver={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseOut={e => e.currentTarget.style.background = ''}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: 'var(--acc)' }}>{v.id}</span>
                  <Pill s={v.tipo} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{v.tracto} · {v.gondola1}{v.gondola2 ? ' + ' + v.gondola2 : ''} · {v.operador}</div>
                <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 1 }}>Salida: {v.fecha_salida || '—'} {v.hora_salida || ''} · {v.mina || '—'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700 }}>{(v.m3_1||0)+(v.m3_2||0)} m³</div>
                <button className="btn btn-ok btn-sm" style={{ marginTop: 6 }} onClick={e => { e.stopPropagation(); setLleg(v) }}>
                  <i className="ti ti-circle-check" />Registrar llegada
                </button>
              </div>
            </div>
          )) : (
            <div className="empty" style={{ padding: 24 }}>
              <i className="ti ti-circle-check" />
              <p>{q.length >= 2 ? 'Sin resultados para esa búsqueda' : 'Sin viajes abiertos pendientes'}</p>
            </div>
          )}
        </div>
      </div>

      {llegadaViaje && (
        <ModalLlegada viaje={llegadaViaje} onClose={() => setLleg(null)} onSaved={() => setLleg(null)} />
      )}
    </div>
  )
}
