import { useState } from 'react'
import { useApp } from '../lib/AppContext'

const NAV = [
  { id: 'home',       ico: 'home',             label: 'Inicio',           roles: ['checador','aux_contador'] },
  { id: 'dash',       ico: 'layout-dashboard', label: 'Dashboard',        roles: ['admin','contador','supervisor'] },
  { id: 'dash-ruta',  ico: 'truck-delivery',   label: 'Viajes en Ruta',   roles: ['admin','contador','supervisor'] },
  { id: 'dash-fin',   ico: 'chart-pie',        label: 'Financiero',       roles: ['admin','contador'] },
  { id: 'viajes',     ico: 'truck',            label: 'Todos los viajes', roles: ['admin'] },
  { id: 'flotilla',   ico: 'truck-delivery',   label: 'Flotilla',         roles: ['admin','contador','supervisor'] },
  { id: 'agremiados', ico: 'users-group',      label: 'Agremiados',       roles: ['admin','contador','supervisor'] },
  { id: 'est',        ico: 'file-invoice',     label: 'Estimaciones',     roles: ['admin','contador','supervisor'] },
  { id: 'pagos',      ico: 'cash',             label: 'Pagos',            roles: ['admin','contador'] },
  { id: 'reportes',   ico: 'chart-bar',        label: 'Reportes',         roles: ['admin','contador','supervisor'] },
  { id: 'config',     ico: 'settings',         label: 'Configuración',    roles: ['admin'] },
  { id: 'usuarios',   ico: 'users',            label: 'Usuarios',         roles: ['admin'] },
]

export default function Sidebar({ current, onChange, badges = {} }) {
  const { user, logout, config } = useApp()
  const [exp, setExp] = useState(false)
  const rol = user?.rol
  const visible = NAV.filter(n => n.roles.includes(rol))

  const logoUrl = config?.logo_url

  return (
    <aside className={`sb${exp ? ' exp' : ''}`}>
      <div className="sb-logo" title="Julios Catem">
        {logoUrl
          ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
          : <span>JC</span>
        }
      </div>

      {visible.map(n => (
        <button key={n.id} className={`ni${current === n.id ? ' active' : ''}`}
          onClick={() => onChange(n.id)} title={n.label}>
          <i className={`ti ti-${n.ico}`} />
          <span className="ni-lbl">{n.label}</span>
          {badges[n.id] ? <span className="bdg">{badges[n.id]}</span> : null}
        </button>
      ))}

      <div className="sb-sep" />

      <div className="sb-foot">
        <button className="ni" onClick={() => setExp(!exp)} title="Expandir">
          <i className={`ti ti-layout-sidebar${exp ? '-right' : ''}`} />
          <span className="ni-lbl">Colapsar</span>
        </button>
        <button className="ni" onClick={logout} title="Salir">
          <i className="ti ti-logout" />
          <span className="ni-lbl">Salir</span>
        </button>
      </div>
    </aside>
  )
}
