import { useState, useMemo } from 'react'
import { AppProvider, useApp } from './lib/AppContext'
import { ToastProvider, useToast } from './components/Toast'
import Sidebar from './components/Sidebar'
import Login from './views/Login'
import Dashboard from './views/Dashboard'
import ViewViajes from './views/ViewViajes'
import ViewEstimaciones from './views/ViewEstimaciones'
import ViewConciliaciones from './views/ViewConciliaciones'
import ViewPagos from './views/ViewPagos'
import ViewReportes from './views/ViewReportes'
import ViewConfig from './views/ViewConfig'
import ViewUsuarios from './views/ViewUsuarios'
import HomeChecador from './views/HomeChecador'
import HomeAuxContador from './views/HomeAuxContador'
import ModalTicket from './components/ModalTicket'

const TITLES = {
  home: 'Inicio', dash: 'Dashboard', viajes: 'Todos los viajes',
  est: 'Estimaciones', concil: 'Conciliaciones', pagos: 'Pagos',
  reportes: 'Reportes', config: 'Configuración', usuarios: 'Usuarios',
}

function AppInner() {
  const { user, viajes, loading } = useApp()
  const toast = useToast()
  const [view, setView] = useState(null)
  const [showTicket, setShowTicket] = useState(false)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-loader-2" style={{ fontSize: 32, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }} />
        Cargando...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!user) return <Login />

  // Default view by role
  const defaultView = {
    admin: 'dash', contador: 'dash', supervisor: 'dash',
    checador: 'home', aux_contador: 'home',
  }
  const cur = view || defaultView[user.rol] || 'dash'

  // Badges
  const badges = useMemo(() => {
    const abiertos   = viajes.filter(v => v.estado === 'abierto').length
    const pendConcil = viajes.filter(v => v.estado === 'pendiente_conciliar').length
    const pendPago   = viajes.filter(v => v.estado === 'pendiente_pago').length
    return {
      viajes:  abiertos + pendConcil > 0 ? abiertos + pendConcil : 0,
      concil:  pendConcil > 0 ? pendConcil : 0,
      pagos:   pendPago > 0 ? pendPago : 0,
    }
  }, [viajes])

  const views = {
    home:     user.rol === 'aux_contador' ? <HomeAuxContador /> : <HomeChecador onNewTicket={() => setShowTicket(true)} />,
    dash:     <Dashboard onNewTicket={() => setShowTicket(true)} />,
    viajes:   <ViewViajes onNewTicket={() => setShowTicket(true)} />,
    est:      <ViewEstimaciones />,
    concil:   <ViewConciliaciones />,
    pagos:    <ViewPagos />,
    reportes: <ViewReportes />,
    config:   <ViewConfig />,
    usuarios: <ViewUsuarios />,
  }

  const canAddTicket = ['admin', 'checador'].includes(user.rol)

  return (
    <div className="app">
      <Sidebar current={cur} onChange={setView} badges={badges} />
      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-title">{TITLES[cur] || cur}</div>
          {cur !== 'home' && (
            <div className="tsearch">
              <i className="ti ti-search tsearch-ico" />
              <input placeholder="Ticket ID, placa, operador..." />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="sync-pill">
              <div className="sdot" />
              <span>Online</span>
            </div>
            {canAddTicket && (
              <button className="btn btn-acc btn-sm" onClick={() => setShowTicket(true)}>
                <i className="ti ti-plus" />Ticket
              </button>
            )}
          </div>
        </div>

        <div className="content">
          {views[cur] || views.dash}
        </div>
      </div>

      {showTicket && <ModalTicket onClose={() => setShowTicket(false)} onSaved={() => toast('Ticket registrado', 'ok')} />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AppProvider>
  )
}
