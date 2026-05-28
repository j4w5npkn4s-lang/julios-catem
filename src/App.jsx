import { useState } from 'react'
import { AppProvider, useApp } from './lib/AppContext'
import { ToastProvider, useToast } from './components/Toast'
import Sidebar from './components/Sidebar'
import Login from './views/Login'
import Dashboard from './views/Dashboard'
import ViewViajes from './views/ViewViajes'
import ViewFlotilla from './views/ViewFlotilla'
import ViewAgremiados from './views/ViewAgremiados'
import ViewEstimaciones from './views/ViewEstimaciones'
import { ViewPagos, ViewReportes, ViewConfig, ViewUsuarios } from './views/ViewOthers'
import HomeChecador from './views/HomeChecador'
import HomeAuxContador from './views/HomeAuxContador'
import ModalTicket from './components/ModalTicket'

const TITLES = {
  home: 'Inicio', dash: 'Dashboard', viajes: 'Todos los viajes',
  flotilla: 'Flotilla', agremiados: 'Agremiados',
  est: 'Estimaciones', concil: 'Conciliaciones', pagos: 'Pagos',
  reportes: 'Reportes', config: 'Configuración', usuarios: 'Usuarios',
}

function AppInner() {
  const { user, viajes, loading, loadAll } = useApp()
  const toast = useToast()
  const [view, setView]         = useState(null)
  const [showTicket, setShowTicket] = useState(false)
  const [searchQ, setSearchQ]   = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [pullStart, setPullStart]   = useState(0)
  const [pullDist, setPullDist]     = useState(0)

  async function doRefresh() {
    setRefreshing(true)
    await loadAll()
    setTimeout(() => setRefreshing(false), 600)
  }

  function onTouchStart(e) { setPullStart(e.touches[0].clientY) }
  function onTouchMove(e) {
    const dist = e.touches[0].clientY - pullStart
    const el = e.currentTarget
    if (dist > 0 && el.scrollTop === 0) setPullDist(Math.min(dist, 80))
  }
  async function onTouchEnd() {
    if (pullDist > 60) doRefresh()
    setPullDist(0)
  }

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

  const defaultView = { admin: 'dash', contador: 'dash', supervisor: 'dash', checador: 'home', aux_contador: 'home' }
  const cur = view || defaultView[user.rol] || 'dash'

  const badges = {
    viajes:  viajes.filter(v => ['abierto','pendiente_conciliar'].includes(v.estado)).length || 0,
    pagos:   viajes.filter(v => v.estado === 'pendiente_pago').length || 0,
  }

  const canAddTicket = ['admin', 'checador'].includes(user.rol)

  function handleNav(v) { setView(v); setSearchQ('') }

  function renderView() {
    switch (cur) {
      case 'home':       return user.rol === 'aux_contador' ? <HomeAuxContador /> : <HomeChecador onNewTicket={() => setShowTicket(true)} />
      case 'dash':       return <Dashboard onNewTicket={() => setShowTicket(true)} searchQ={searchQ} />
      case 'viajes':     return <ViewViajes onNewTicket={() => setShowTicket(true)} searchQ={searchQ} />
      case 'flotilla':   return <ViewFlotilla />
      case 'agremiados': return <ViewAgremiados />
      case 'est':        return <ViewEstimaciones />
      case 'pagos':      return <ViewPagos />
      case 'reportes':   return <ViewReportes />
      case 'config':     return <ViewConfig />
      case 'usuarios':   return <ViewUsuarios />
      default:           return <Dashboard onNewTicket={() => setShowTicket(true)} />
    }
  }

  return (
    <div className="app">
      <Sidebar current={cur} onChange={handleNav} badges={badges} />
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">{TITLES[cur] || cur}</div>
          {cur !== 'home' && (
            <div className="tsearch">
              <i className="ti ti-search tsearch-ico" />
              <input
                placeholder="Ticket ID, placa, operador..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="sync-pill"><div className="sdot" /><span>Online</span></div>
            <button className="btn btn-out btn-sm" onClick={() => loadAll()} title="Actualizar datos" style={{ padding: '0 8px', height: 28 }}>
              <i className="ti ti-refresh" style={{ fontSize: 15 }} />
            </button>
            {canAddTicket && (
              <button className="btn btn-acc btn-sm" onClick={() => setShowTicket(true)}>
                <i className="ti ti-plus" />Ticket
              </button>
            )}
          </div>
        </div>
        <div className="content"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Pull to refresh indicator */}
          {(pullDist > 10 || refreshing) && (
            <div style={{ textAlign:'center', padding:'8px 0', fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .2s' }}>
              <i className={`ti ti-refresh${refreshing?' spin':''}`} style={{ fontSize:16, animation: refreshing?'spin 1s linear infinite':undefined }} />
              {refreshing ? 'Actualizando...' : pullDist > 60 ? 'Suelta para actualizar' : 'Jala para actualizar'}
            </div>
          )}
          <style>{'.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          {renderView()}
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
