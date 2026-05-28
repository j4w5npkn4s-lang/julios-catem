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
  const [scanning, setScanning]     = useState(false)
  const [scanStream, setScanStream]  = useState(null)
  const [pullStart, setPullStart]   = useState(0)
  const [pullDist, setPullDist]     = useState(0)

  async function startTopScanner() {
    if (!('BarcodeDetector' in window)) {
      toast('Escáner no disponible — escribe el folio manualmente', 'warn')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      setScanStream(stream)
      setScanning(true)
      await new Promise(r => setTimeout(r, 400))
      const video = document.getElementById('top-scan-video')
      if (!video) { stream.getTracks().forEach(t => t.stop()); return }
      video.srcObject = stream
      video.setAttribute('playsinline', true)
      await video.play().catch(() => {})
      const detector = new BarcodeDetector({ formats: ['code_128','code_39','ean_13','ean_8','itf','codabar'] })
      let active = true
      const scan = async () => {
        if (!active) return
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video)
            if (codes.length > 0) {
              setSearchQ(codes[0].rawValue)
              active = false
              stream.getTracks().forEach(t => t.stop())
              setScanStream(null)
              setScanning(false)
              // Navigate to viajes view
              setView('viajes')
              toast('✓ Buscando: ' + codes[0].rawValue, 'ok')
              return
            }
          }
        } catch {}
        if (active) setTimeout(scan, 200)
      }
      video.onloadedmetadata = () => scan()
      setTimeout(scan, 1000)
    } catch (err) {
      setScanning(false)
      if (err.name === 'NotAllowedError') toast('Permiso de cámara denegado', 'err')
      else toast('Error al iniciar escáner: ' + err.message, 'err')
    }
  }

  function stopTopScanner() {
    scanStream?.getTracks().forEach(t => t.stop())
    setScanStream(null)
    setScanning(false)
  }

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
            <div className="tsearch" style={{ display:'flex', gap:6, alignItems:'center' }}>
              <div style={{ position:'relative', flex:1 }}>
                <i className="ti ti-search tsearch-ico" />
                <input
                  placeholder="Ticket ID, placa, operador..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                />
              </div>
              <button className="btn btn-out" style={{ padding:'0 8px', height:30, flexShrink:0 }} onClick={startTopScanner} title="Escanear código de barras">
                <i className="ti ti-barcode" style={{ fontSize:16 }} />
              </button>
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
            {/* SCANNER OVERLAY GLOBAL */}
      {scanning && (
        <div style={{ position:'fixed', inset:0, background:'#000', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ position:'relative', width:'100%', maxWidth:440 }}>
            <video id="top-scan-video" autoPlay playsInline muted style={{ width:'100%', borderRadius:8, background:'#000' }} />
            <div style={{ position:'absolute', inset:0, border:'2px solid var(--acc)', borderRadius:8, pointerEvents:'none' }}>
              <div style={{ position:'absolute', left:'10%', right:'10%', height:2, background:'rgba(245,158,11,.8)', animation:'scan 1.5s ease-in-out infinite' }} />
            </div>
          </div>
          <div style={{ color:'#fff', fontSize:13, marginTop:16 }}>Apunta al código de barras del ticket</div>
          <button className="btn btn-danger" style={{ marginTop:16 }} onClick={stopTopScanner}>
            <i className="ti ti-x" />Cancelar
          </button>
          <style>{`@keyframes scan { 0%,100%{top:15%} 50%{top:80%} }`}</style>
        </div>
      )}

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
