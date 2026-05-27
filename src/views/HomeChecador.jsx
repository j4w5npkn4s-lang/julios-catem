import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalLlegada from '../components/ModalLlegada'

export default function HomeChecador({ onNewTicket }) {
  const { user, viajes, today } = useApp()
  const [search, setSearch]       = useState('')
  const [llegadaViaje, setLlegada] = useState(null)

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = user?.nombre?.split(' ')[0] || ''

  const abiertos = useMemo(() => viajes.filter(v => v.estado === 'abierto'), [viajes])
  const hoy      = useMemo(() => viajes.filter(v => v.fecha_salida === today()), [viajes, today])

  const resultados = useMemo(() => {
    if (!search || search.length < 2) return []
    const q = search.toLowerCase()
    return viajes.filter(v =>
      (v.id + v.tracto + v.operador + (v.gondola1||'')).toLowerCase().includes(q)
    ).slice(0, 6)
  }, [search, viajes])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 20 }}>
      {/* Saludo */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{saludo}, {nombre}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* BOTÓN PRINCIPAL */}
      <button className="ch-btn-main" onClick={onNewTicket} style={{ marginBottom: 12 }}>
        <i className="ti ti-plus" style={{ fontSize: 40, display: 'block', marginBottom: 10, color: '#000' }} />
        <div style={{ fontSize: 20, fontWeight: 700, color: '#000' }}>Registrar nuevo ticket</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,.6)', marginTop: 4 }}>Ticket de salida · Foto tracto</div>
      </button>

      {/* REGISTRAR LLEGADA */}
      <button className="ch-btn-sec" onClick={() => setLlegada('buscar')} style={{ marginBottom: 12 }}>
        <i className="ti ti-circle-check" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: 'var(--ok)' }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>Registrar llegada</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Ticket de término · Cierre de viaje</div>
        {abiertos.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={{ background: 'rgba(245,158,11,.2)', color: 'var(--acc)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
              {abiertos.length} viaje{abiertos.length !== 1 ? 's' : ''} abierto{abiertos.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </button>

      {/* BUSCADOR */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
          <i className="ti ti-search" style={{ color: 'var(--muted)' }} />Buscar ticket
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Ticket ID, placa, operador..."
          style={{ height: 42, fontSize: 14 }}
        />
        {resultados.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {resultados.map(v => (
              <div key={v.id} data-vid={v.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--bg3)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}
                onClick={() => { /* open detail */ }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: 'var(--acc)' }}>{v.id}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{v.tracto} · {v.operador} · {v.fecha_salida || '—'}</div>
                </div>
                <Pill s={v.estado} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TICKETS DE HOY */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
          <i className="ti ti-calendar-today" style={{ color: 'var(--acc)' }} />
          Tickets de hoy
          <span style={{ marginLeft: 'auto', background: 'var(--bg3)', color: 'var(--muted)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{hoy.length}</span>
        </div>
        {hoy.length ? hoy.map(v => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: 'var(--acc)' }}>{v.id}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{v.tracto} · {v.operador}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Pill s={v.estado} />
              <div style={{ display: 'flex', gap: 3, marginTop: 4, justifyContent: 'flex-end' }}>
                <span className={`pill ${v.foto_ticket_salida ? 'pg' : 'pr'}`} style={{ fontSize: 8 }}>{v.foto_ticket_salida ? '✓' : '✗'} T.Sal</span>
                <span className={`pill ${v.foto_tracto ? 'pg' : 'pr'}`} style={{ fontSize: 8 }}>{v.foto_tracto ? '✓' : '✗'} Tracto</span>
              </div>
            </div>
          </div>
        )) : (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--muted)', fontSize: 12 }}>Sin tickets registrados hoy</div>
        )}
      </div>

      {/* MODAL BUSCAR LLEGADA */}
      {llegadaViaje === 'buscar' && (
        <BuscadorLlegada
          abiertos={abiertos}
          onSelect={v => setLlegada(v)}
          onClose={() => setLlegada(null)}
        />
      )}
      {llegadaViaje && llegadaViaje !== 'buscar' && (
        <ModalLlegada viaje={llegadaViaje} onClose={() => setLlegada(null)} onSaved={() => setLlegada(null)} />
      )}
    </div>
  )
}

function BuscadorLlegada({ abiertos, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const filtrados = abiertos.filter(v =>
    !q || q.length < 2 || (v.id + v.tracto + v.operador).toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="ov" onClick={e => e.target.classList.contains('ov') && onClose()}>
      <div className="modal">
        <div className="mh"><div className="mt2">¿A qué viaje llegó?</div><button className="mx" onClick={onClose}>×</button></div>
        <div className="mb">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por ticket ID o placa..." style={{ marginBottom: 10 }} autoFocus />
          <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 7 }}>
            {filtrados.length ? filtrados.map(v => (
              <div key={v.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onClick={() => onSelect(v)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: 'var(--acc)' }}>{v.id}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{v.tracto} · {v.gondola1} · {v.operador}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 1 }}>Salida: {v.fecha_salida || '—'} · {v.mina || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Pill s={v.tipo} />
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                    {(v.m3_1 || 0) + (v.m3_2 || 0)} m³
                  </div>
                </div>
                <i className="ti ti-chevron-right" style={{ color: 'var(--muted)', fontSize: 16 }} />
              </div>
            )) : (
              <div className="empty" style={{ padding: 20 }}><p>Sin viajes abiertos</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
