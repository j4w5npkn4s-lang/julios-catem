import { useState } from 'react'
import ModalDetallePago from '../components/ModalDetallePago'
import ModalPago from '../components/ModalPago'
import ModalDetalleViaje from '../components/ModalDetalleViaje'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

// ══ PAGOS ══
export function ViewPagos({ searchQ = '' }) {
  const { viajes, agremiados, pagos, vPago, vM3, fmt, perm } = useApp()
  const toast = useToast()
  const [fAgremiado, setFAgremiado] = useState('')
  const [fEstado, setFEstado]       = useState('sin_pagar')
  const [selec, setSelec]           = useState(new Set())
  const [pagoVs, setPagoVs]         = useState(null)
  const [tab, setTab]               = useState('pendientes')
  const [detallePago, setDetallePago] = useState(null)
  const [detalleViaje, setDetalleViaje] = useState(null)
  const p = perm()


  // Viajes filtrados
  const vsFiltrados = viajes.filter(v => {
    if (fEstado === 'sin_pagar') {
      // Sin pagar = no tienen registro de pago (pagado !== true)
      if (v.pagado === true) return false
    } else if (fEstado === 'abierto') {
      if (v.estado !== 'abierto') return false
    } else if (fEstado === 'pendiente_pago') {
      if (v.estado !== 'pendiente_pago') return false
    } else if (fEstado === 'cerrado_sin_pagar') {
      if (v.estado !== 'cerrado' || v.pagado === true) return false
    } else if (fEstado === 'pagados') {
      if (v.pagado !== true) return false
    } else if (fEstado) {
      if (v.estado !== fEstado) return false
    }
    if (fAgremiado && v.agremiado_id !== fAgremiado) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      const ag = agremiados?.find(a=>a.id===v.agremiado_id)?.nombre || ''
      const haystack = `${v.id} ${v.folio2||''} ${v.tracto} ${v.operador||''} ${ag}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  function toggleSelec(id) {
    const s = new Set(selec)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelec(s)
  }
  function toggleAll() {
    setSelec(selecAllSelected ? new Set() : new Set(vsFiltrados.map(v=>v.id)))
  }

  const selecViajes = vsFiltrados.filter(v => selec.has(v.id))
  const selecAllSelected = vsFiltrados.length > 0 && selecViajes.length === vsFiltrados.length
  const totalPago   = selecViajes.reduce((a,v) => a + vPago(v), 0)

  // Fotos status
  const fotosBadge = v => {
    const ok  = [v.foto_ticket_salida, v.foto_tracto, v.foto_ticket_llegada].filter(Boolean).length
    const tot = 3
    return { ok, tot, completo: ok === tot }
  }

  const getNombreAgremiado = id => agremiados.find(a=>a.id===id)?.nombre || '—'

  return (
    <div>
      {/* Tabs */}
      <div className="dtabs" style={{ marginBottom: 12 }}>
        <button className={`dtab${tab==='pendientes'?' active':''}`} onClick={() => setTab('pendientes')}>💰 Pendientes de pago</button>
        <button className={`dtab${tab==='historial'?' active':''}`} onClick={() => setTab('historial')}>📋 Historial de pagos</button>
      </div>

      {tab === 'pendientes' && <>
      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <select value={fAgremiado} onChange={e => { setFAgremiado(e.target.value); setSelec(new Set()) }}
          style={{ height:32, fontSize:11, padding:'0 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:7, color:'var(--text)', minWidth:160 }}>
          <option value="">Todos los agremiados</option>
          {agremiados.filter(a=>a.activo!==false).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select value={fEstado} onChange={e => { setFEstado(e.target.value); setSelec(new Set()) }}
          style={{ height:32, fontSize:11, padding:'0 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:7, color:'var(--text)', minWidth:160 }}>
          <option value="sin_pagar">Sin pagar (todos)</option>
          <option value="cerrado_sin_pagar">⚠️ Cerrados sin pagar</option>
          <option value="abierto">Adelantos (viajes abiertos)</option>
          <option value="pendiente_pago">Pendientes de pago</option>
          <option value="pagados">✓ Pagados</option>
          <option value="">Todos</option>
        </select>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{vsFiltrados.length} viaje(s)</span>
        <div style={{ flex:1 }} />

      </div>

      {/* Botón seleccionar todos */}
      <div style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
        <button className="btn btn-out btn-sm" onClick={toggleAll}>
          {selecAllSelected
            ? <><i className="ti ti-square-minus" />Deseleccionar todos</>
            : <><i className="ti ti-checkbox" />Seleccionar todos ({vsFiltrados.length})</>
          }
        </button>
        {selecViajes.length > 0 && (
          <span style={{ fontSize:11, color:'var(--muted)' }}>
            {selecViajes.length} de {vsFiltrados.length} seleccionados
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="tc">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th style={{width:48, textAlign:'center'}}>
                  <div onClick={toggleAll} style={{width:22,height:22,borderRadius:5,border:`2px solid ${selecAllSelected?'var(--acc)':'var(--border2)'}`,background:selecAllSelected?'var(--acc)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}}>
                    {selecAllSelected&&<i className="ti ti-check" style={{fontSize:13,color:'#000'}}/>}
                    {selecViajes.length>0&&!selecAllSelected&&<i className="ti ti-minus" style={{fontSize:13,color:'var(--acc)'}}/>}
                  </div>
                </th>
                <th>TICKET</th><th>AGREMIADO</th><th>TRACTO</th><th>TIPO</th>
                <th>OPERADOR</th><th>FECHA SAL.</th><th>M³</th><th>A PAGAR</th>
                <th>FOTOS</th><th>ESTADO</th><th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {vsFiltrados.length ? vsFiltrados.map(v => {
                const fb = fotosBadge(v)
                return (
                  <tr key={v.id} className="tr" onClick={() => setDetalleViaje(v)}>
                    <td onClick={e => e.stopPropagation()} style={{width:48, textAlign:'center'}}>
                      <div onClick={() => toggleSelec(v.id)} style={{width:22,height:22,borderRadius:5,border:`2px solid ${selec.has(v.id)?'var(--acc)':'var(--border2)'}`,background:selec.has(v.id)?'var(--acc)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',flexShrink:0,transition:'all .15s'}}>
                        {selec.has(v.id)&&<i className="ti ti-check" style={{fontSize:13,color:'#000'}}/>}
                      </div>
                    </td>
                    <td><span className="mono" style={{ color:'var(--acc)' }}>{v.id}</span></td>
                    <td style={{ fontSize:10 }}>{getNombreAgremiado(v.agremiado_id)}</td>
                    <td><b>{v.tracto}</b></td>
                    <td><span className={`pill ${v.tipo==='full'?'pp':'pgr'}`}>{v.tipo?.toUpperCase()}</span></td>
                    <td style={{ fontSize:10 }}>{v.operador}</td>
                    <td style={{ fontSize:10 }}>{v.fecha_salida||'—'}</td>
                    <td className="mono">{vM3(v)}</td>
                    <td className="mono" style={{ color:'var(--pago)' }}>{fmt(vPago(v))}</td>
                    <td>
                      <span className={`pill ${v.foto_ticket_salida?'pg':'pr'}`} style={{fontSize:8,marginRight:2}}>T.Sal</span>
                      <span className={`pill ${v.foto_tracto?'pg':'pr'}`} style={{fontSize:8,marginRight:2}}>Tracto</span>
                      <span className={`pill ${v.foto_ticket_llegada?'pg':'pr'}`} style={{fontSize:8}}>T.Lle</span>
                    </td>
                    <td>
                      {v.pagado === true
                        ? <span className="pill pg" style={{fontSize:9}}>✓ Pagado</span>
                        : v.estado === 'cerrado'
                          ? <span className="pill pr" style={{fontSize:9}}>⚠ Cerrado sin pagar</span>
                          : v.estado === 'pendiente_pago'
                            ? <span className="pill pp" style={{fontSize:9}}>Pend. pago</span>
                            : <span className="pill pa" style={{fontSize:9}}>{v.estado==='abierto'?'Adelanto posible':'Pend. conciliar'}</span>
                      }
                    </td>
                    {v.pagado !== true && p.canPagar && (
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ok btn-xs" onClick={() => setPagoVs([v])}>
                          <i className="ti ti-cash" />Pagar
                        </button>
                      </td>
                    )}
                  </tr>
                )
              }) : (
                <tr><td colSpan={11} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>Sin viajes con ese filtro</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* BARRA TOTAL SELECCIONADOS */}
        {selecViajes.length > 0 && (
          <div style={{ padding:'14px 16px', borderTop:'2px solid var(--border)', background:'var(--bg3)', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div style={{ fontSize:12, color:'var(--muted)' }}>
              <b style={{ color:'var(--text)', fontSize:14 }}>{selecViajes.length}</b> ticket{selecViajes.length!==1?'s':''} seleccionado{selecViajes.length!==1?'s':''}
            </div>
            <div style={{ fontSize:12 }}>
              M³: <b style={{ fontFamily:"'Space Mono',monospace" }}>{selecViajes.reduce((a,v)=>a+vM3(v),0).toFixed(2)}</b>
            </div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:'var(--pago)' }}>
              Total a pagar: {fmt(totalPago)}
            </div>
            <div style={{ flex:1 }} />
            <button className="btn btn-out btn-sm" onClick={() => setSelec(new Set())}>
              <i className="ti ti-x" />Limpiar
            </button>
            {p.canPagar && (
              <button className="btn btn-ok" style={{ padding:'10px 20px', fontSize:13 }} onClick={() => setPagoVs(selecViajes)}>
                <i className="ti ti-cash" style={{ fontSize:16 }} />Pagar {selecViajes.length} ticket{selecViajes.length!==1?'s':''}
              </button>
            )}
          </div>
        )}
      </div>

      {pagoVs && <ModalPago viajes={pagoVs} onClose={() => { setPagoVs(null); setSelec(new Set()) }} onSaved={() => { setPagoVs(null); setSelec(new Set()) }} />}
      </>}

      {tab === 'historial' && <HistorialPagos onDetalle={setDetallePago} searchQ={searchQ} />}

      {detallePago && <ModalDetallePago pago={detallePago} onClose={() => setDetallePago(null)} />}
      {detalleViaje && <ModalDetalleViaje viaje={detalleViaje} onClose={() => setDetalleViaje(null)} />}
    </div>
  )
}

function HistorialPagos({ onDetalle, searchQ = '' }) {
  const { pagos, viajes, agremiados, fmt } = useApp()
  const [fAgr, setFAgr] = useState('')

  // Deduplicate: group masivo pagos by folio_masivo, show individual pagos
  const groups = []
  const seen = new Set()
  pagos.forEach(p => {
    if (p.masivo && p.folio_masivo) {
      if (!seen.has(p.folio_masivo)) {
        seen.add(p.folio_masivo)
        const grupo = pagos.filter(x => x.folio_masivo === p.folio_masivo)
        const total = grupo.reduce((a,x) => a+x.monto,0)
        const viajesGrupo = grupo.map(x => viajes.find(v=>v.id===x.viaje_id)).filter(Boolean)
        const agId = viajesGrupo[0]?.agremiado_id
        groups.push({ ...p, _total: total, _count: grupo.length, _agId: agId, _folios: viajesGrupo.map(v=>v.id) })
      }
    } else {
      const v = viajes.find(x=>x.id===p.viaje_id)
      groups.push({ ...p, _total: p.monto, _count: 1, _agId: v?.agremiado_id, _folios: v ? [v.id] : [] })
    }
  })

  const getNombre = id => agremiados.find(a=>a.id===id)?.nombre||'—'

  const filtered = groups.filter(g => {
    if (fAgr && g._agId !== fAgr) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      const haystack = `${g.folio||''} ${getNombre(g._agId)} ${(g._folios||[]).join(' ')}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
        <select value={fAgr} onChange={e=>setFAgr(e.target.value)}
          style={{ height:30, fontSize:11, padding:'0 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:7, color:'var(--text)', minWidth:160 }}>
          <option value="">Todos los agremiados</option>
          {agremiados.filter(a=>a.activo!==false).map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <span style={{ fontSize:11, color:'var(--muted)' }}>{filtered.length} pago(s)</span>
      </div>
      <div className="tc">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>FECHA</th><th>AGREMIADO</th><th>TIPO</th><th>VIAJES</th>
                <th>MONTO TOTAL</th><th>FOLIO</th><th>COMPROBANTE</th><th>VER</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((p,i) => (
                <tr key={p.id+i} className="tr" onClick={() => onDetalle(p)}>
                  <td>{p.fecha}</td>
                  <td style={{fontSize:10}}>{getNombre(p._agId)}</td>
                  <td>{p.masivo ? <span className="pill pp">Masivo</span> : <span className="pill pgr">Individual</span>}</td>
                  <td className="mono" style={{textAlign:'center'}}>{p._count}</td>
                  <td className="mono" style={{color:'var(--ok)',fontWeight:700}}>{fmt(p._total)}</td>
                  <td style={{fontSize:10,color:'var(--muted)'}}>{p.folio||'—'}</td>
                  <td>{p.comprobante_url?<span className="pill pg" style={{fontSize:9}}>✓ Sí</span>:<span className="pill pr" style={{fontSize:9}}>No</span>}</td>
                  <td><button className="btn btn-info btn-xs" onClick={e=>{e.stopPropagation();onDetalle(p)}}><i className="ti ti-eye"/>Ver</button></td>
                </tr>
              )) : (
                <tr><td colSpan={8} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>Sin pagos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══ REPORTES ══
export function ViewReportes() {
  const { viajes, vM3 } = useApp()
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [texto, setTexto] = useState('')
  const [generando, setGenerando] = useState(false)

  const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  function getFStr(f) {
    const [y,m,d] = f.split('-')
    return `${d} ${meses[parseInt(m)]} ${y}`
  }

  function getDatos() {
    const vs  = viajes.filter(v => v.fecha_salida === fecha)
    const sen = vs.filter(v => v.tipo === 'sencillo')
    const ful = vs.filter(v => v.tipo === 'full')
    const m3Sen = sen.reduce((a,v) => a+vM3(v), 0)
    const m3Ful = ful.reduce((a,v) => a+vM3(v), 0)
    return { vs, sen, ful, m3Sen, m3Ful, total: vs.length, totalM3: m3Sen+m3Ful }
  }

  function generar() {
    const { vs, sen, ful, m3Sen, m3Ful } = getDatos()
    if (!vs.length) { setTexto('Sin viajes para el ' + fecha); return }
    const fStr = getFStr(fecha)
    const t = [
      '🚛 *REPORTE DE VIAJES*',
      `📅 *${fStr}*`,
      '',
      '*SENCILLOS*',
      `• Unidades: *${sen.length}*`,
      `• M³: *${m3Sen.toFixed(2)}*`,
      '',
      '*FULL*',
      `• Unidades: *${ful.length}*`,
      `• M³: *${m3Ful.toFixed(2)}*`,
      '',
      '─────────────────',
      '*TOTAL*',
      `• Viajes: *${vs.length}*`,
      `• M³: *${(m3Sen+m3Ful).toFixed(2)}*`,
    ].join('\n')
    setTexto(t)
  }

  async function generarImagenYWhatsApp() {
    const { vs, sen, ful, m3Sen, m3Ful } = getDatos()
    if (!vs.length) { alert('Sin viajes para esa fecha'); return }
    setGenerando(true)
    try {
      const fStr = getFStr(fecha)
      const canvas = document.createElement('canvas')
      canvas.width  = 800
      canvas.height = 560
      const ctx = canvas.getContext('2d')

      // Fondo oscuro degradado
      const grad = ctx.createLinearGradient(0, 0, 800, 560)
      grad.addColorStop(0, '#111318')
      grad.addColorStop(1, '#1A1D24')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 800, 560)

      // Borde naranja arriba
      ctx.fillStyle = '#F59E0B'
      ctx.fillRect(0, 0, 800, 5)

      // Logo como imagen
      await new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          // Círculo recortado para logo
          ctx.save()
          ctx.beginPath()
          ctx.arc(72, 72, 48, 0, Math.PI*2)
          ctx.clip()
          ctx.drawImage(img, 24, 24, 96, 96)
          ctx.restore()
          resolve()
        }
        img.onerror = resolve
        img.src = '/icon-192.png'
      })

      // Nombre app
      ctx.fillStyle = '#F59E0B'
      ctx.font = 'bold 22px "Space Mono", monospace'
      ctx.fillText('JULIOS CATEM · JSV', 140, 52)
      ctx.fillStyle = '#8A8F9E'
      ctx.font = '14px DM Sans, sans-serif'
      ctx.fillText('Sistema de Gestión Logística', 140, 76)

      // Fecha
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 28px DM Sans, sans-serif'
      ctx.fillText(`REPORTE DE VIAJES · ${fStr}`, 32, 145)

      // Separador
      ctx.fillStyle = '#2E3340'
      ctx.fillRect(32, 160, 736, 2)

      // Sencillos
      ctx.fillStyle = '#F59E0B'
      ctx.font = 'bold 16px DM Sans'
      ctx.fillText('SENCILLOS', 32, 210)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 64px "Space Mono"'
      ctx.fillText(sen.length, 32, 285)
      ctx.fillStyle = '#8A8F9E'
      ctx.font = '16px DM Sans'
      ctx.fillText('unidades', 32, 312)
      ctx.fillStyle = '#60A5FA'
      ctx.font = 'bold 32px "Space Mono"'
      ctx.fillText(m3Sen.toFixed(1) + ' m³', 32, 358)

      // Separador vertical
      ctx.fillStyle = '#2E3340'
      ctx.fillRect(300, 190, 2, 190)

      // Full
      ctx.fillStyle = '#A78BFA'
      ctx.font = 'bold 16px DM Sans'
      ctx.fillText('FULL', 340, 210)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 64px "Space Mono"'
      ctx.fillText(ful.length, 340, 285)
      ctx.fillStyle = '#8A8F9E'
      ctx.font = '16px DM Sans'
      ctx.fillText('unidades', 340, 312)
      ctx.fillStyle = '#A78BFA'
      ctx.font = 'bold 32px "Space Mono"'
      ctx.fillText(m3Ful.toFixed(1) + ' m³', 340, 358)

      // Separador vertical
      ctx.fillStyle = '#2E3340'
      ctx.fillRect(580, 190, 2, 190)

      // Total
      ctx.fillStyle = '#22C55E'
      ctx.font = 'bold 16px DM Sans'
      ctx.fillText('TOTAL', 620, 210)
      ctx.fillStyle = '#22C55E'
      ctx.font = 'bold 64px "Space Mono"'
      ctx.fillText(vs.length, 620, 285)
      ctx.fillStyle = '#8A8F9E'
      ctx.font = '16px DM Sans'
      ctx.fillText('viajes', 620, 312)
      ctx.fillStyle = '#22C55E'
      ctx.font = 'bold 32px "Space Mono"'
      ctx.fillText((m3Sen+m3Ful).toFixed(1)+' m³', 620, 358)

      // Separador
      ctx.fillStyle = '#2E3340'
      ctx.fillRect(32, 395, 736, 2)

      // Pie
      ctx.fillStyle = '#5A5F6E'
      ctx.font = '13px DM Sans'
      ctx.fillText(`Generado por JSV Tracking · ${new Date().toLocaleString('es-MX')}`, 32, 430)

      // Borde naranja abajo
      ctx.fillStyle = '#F59E0B'
      ctx.fillRect(0, 555, 800, 5)

      // Descargar imagen
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `reporte-jsv-${fecha}.png`
      a.click()

      // Esperar un momento y abrir WhatsApp con texto
      await new Promise(r => setTimeout(r, 1000))
      const txt = `🚛 *REPORTE DE VIAJES JSV*
📅 *${fStr}*

*SENCILLOS:* ${sen.length} uds · ${m3Sen.toFixed(2)} m³
*FULL:* ${ful.length} uds · ${m3Ful.toFixed(2)} m³

─────────────────
*TOTAL:* ${vs.length} viajes · ${(m3Sen+m3Ful).toFixed(2)} m³

_Generado por JSV Tracking_`
      window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank')

    } catch(err) {
      alert('Error: ' + err.message)
    }
    setGenerando(false)
  }

  function enviarWA() {
    if (!texto) return
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank')
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(texto) }
    catch {
      const ta = document.createElement('textarea')
      ta.value = texto; ta.style.position='fixed'; ta.style.opacity='0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    alert('✓ Copiado')
  }

  return (
    <div>
      <div style={{ background: 'var(--bg2)', border: '2px solid rgba(34,197,94,.3)', borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(34,197,94,.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-brand-whatsapp" style={{ fontSize: 22, color: 'var(--ok)' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Reporte diario de viajes</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sin precios · Sin nombres · Para el grupo de jefes</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="fg" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label>Fecha del reporte</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ background: 'var(--bg3)' }} />
          </div>
          <button className="btn btn-out btn-sm" onClick={() => { setFecha(new Date().toISOString().split('T')[0]); setTimeout(generar, 50) }}>
            <i className="ti ti-calendar-today" />Hoy
          </button>
          <button className="btn btn-out btn-sm" onClick={generar}><i className="ti ti-refresh" />Generar</button>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, fontFamily: "'Space Mono',monospace", fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 14, minHeight: 80, color: 'var(--text)' }}>
          {texto || 'Selecciona una fecha y presiona Generar'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ok" style={{ flex: 1, justifyContent: 'center', padding: 13 }} onClick={generarImagenYWhatsApp} disabled={generando}>
            <i className="ti ti-photo" style={{ fontSize: 16 }} />
            {generando ? 'Generando imagen...' : '📸 Imagen + WhatsApp'}
          </button>
          <button className="btn btn-out btn-sm" onClick={enviarWA} title="Solo texto sin imagen">
            <i className="ti ti-brand-whatsapp" />Solo texto
          </button>
          <button className="btn btn-out btn-sm" onClick={copiar}><i className="ti ti-copy" />Copiar</button>
        </div>
      </div>
    </div>
  )
}

// ══ CONFIG ══
export function ViewConfig() {
  const { config, saveConfig, destinos, addDestino, updateDestino, deleteDestino, uploadFoto } = useApp()
  const toast = useToast()
  const [cobro, setCobro] = useState(config.tarifa_cobro || '')
  const [pago, setPago]   = useState(config.tarifa_pago || '')
  const [emp, setEmp]       = useState(config.empresa || '')
  const [obra, setObra]     = useState(config.obra || '')
  const [saving, setSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(config.logo_url || null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  async function handleSaveTarifas() {
    setSaving(true)
    try {
      await saveConfig({ tarifa_cobro: parseFloat(cobro)||0, tarifa_pago: parseFloat(pago)||0 })
      toast('Tarifas guardadas ✓', 'ok')
    } catch (err) { toast(err.message, 'err') }
    setSaving(false)
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSaveEmpresa() {
    setUploadingLogo(true)
    try {
      let logo_url = config.logo_url || null
      if (logoFile) {
        logo_url = await uploadFoto(logoFile, 'logos')
      }
      await saveConfig({ empresa: emp, obra, logo_url })
      toast('Empresa y logo guardados ✓', 'ok')
    } catch (err) { toast(err.message, 'err') }
    setUploadingLogo(false)
  }

  const sim = { m3_1: 30, m3_2: 0, km: 384 }
  const simCob = +((parseFloat(cobro)||0) * 30 * 384).toFixed(2)
  const simPag = +((parseFloat(pago)||0)  * 30 * 384).toFixed(2)
  const simUtil = simCob - simPag

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
      {/* TARIFAS */}
      <div className="tc" style={{ padding: 15 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-calculator" style={{ color: 'var(--acc)' }} />Tarifas de cálculo
        </div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, padding: 13, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cobro)', marginBottom: 8 }}>↗ TARIFA COBRO AL CLIENTE</div>
          <div className="fg"><label>$ por m³ por km</label><input type="number" value={cobro} onChange={e => setCobro(e.target.value)} placeholder="0.00" step="0.01" /></div>
        </div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, padding: 13, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--pago)', marginBottom: 8 }}>↙ TARIFA PAGO AL CAMIONERO</div>
          <div className="fg"><label>$ por m³ por km</label><input type="number" value={pago} onChange={e => setPago(e.target.value)} placeholder="0.00" step="0.01" /></div>
        </div>
        <div className="cbox">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 7 }}>SIMULACIÓN (30 m³ × 384 km)</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>Cobro:</span><span className="mono" style={{ color: 'var(--cobro)' }}>${simCob.toLocaleString('es-MX')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>Pago:</span><span className="mono" style={{ color: 'var(--pago)' }}>${simPag.toLocaleString('es-MX')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0 2px', borderTop: '1px solid var(--border)', marginTop: 4 }}><b>Utilidad:</b><span className="mono" style={{ color: 'var(--util)', fontWeight: 700 }}>${simUtil.toLocaleString('es-MX')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>↳ CATEM (50%):</span><span className="mono" style={{ color: 'var(--util)' }}>${(simUtil/2).toLocaleString('es-MX')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>↳ JSV (50%):</span><span className="mono" style={{ color: 'var(--util)' }}>${(simUtil/2).toLocaleString('es-MX')}</span></div>
        </div>
        <button className="btn btn-acc" style={{ width: '100%', marginTop: 11, justifyContent: 'center' }} onClick={handleSaveTarifas} disabled={saving}>
          <i className="ti ti-device-floppy" />{saving ? 'Guardando...' : 'Guardar tarifas'}
        </button>
      </div>

      <div>
        {/* EMPRESA */}
        <div className="tc" style={{ padding: 15, marginBottom: 11 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-building" style={{ color: 'var(--acc)' }} />Empresa
          </div>
          <div className="fg"><label>Nombre empresa</label><input value={emp} onChange={e => setEmp(e.target.value)} /></div>
          <div className="fg"><label>Obra / Proyecto activo</label><input value={obra} onChange={e => setObra(e.target.value)} /></div>
          <div className="fg">
            <label>Logo de la empresa</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 10, background: logoPreview ? 'transparent' : 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#000', fontFamily: "'Space Mono',monospace", flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : 'JC'
                }
              </div>
              <div style={{ flex: 1 }}>
                <input type="file" id="logo-upload" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
                <button type="button" className="btn btn-out" style={{ width: '100%' }} onClick={() => document.getElementById('logo-upload').click()}>
                  <i className="ti ti-upload" />Subir logo (PNG o JPG)
                </button>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Aparecerá en el login y en el menú lateral</div>
              </div>
            </div>
          </div>
          <button className="btn btn-acc" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSaveEmpresa} disabled={uploadingLogo}>
            <i className="ti ti-device-floppy" />{uploadingLogo ? 'Subiendo logo...' : 'Guardar empresa y logo'}
          </button>
        </div>


      </div>

      {/* DESTINOS */}
      <div className="tc" style={{ padding: 15, marginTop: 11, gridColumn: '1/-1' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-route" style={{ color: 'var(--acc)' }} />Rutas (Origen → Destino → KM)
        </div>
        <div style={{ marginBottom: 10 }}>
          {destinos.filter(d => d.activo !== false).map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
              <span style={{ flex: 1, color: 'var(--cobro)' }}>{d.origen}</span>
              <span style={{ color: 'var(--muted)' }}>→</span>
              <span style={{ flex: 1, color: 'var(--info)' }}>{d.destino}</span>
              <input type="number" defaultValue={d.km} placeholder="KM"
                style={{ width: 70, padding: '3px 6px', fontSize: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }}
                onBlur={e => updateDestino(d.id, { km: parseFloat(e.target.value)||0 })} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>km</span>
              <button className="btn btn-danger btn-xs" onClick={() => deleteDestino(d.id)}><i className="ti ti-x" /></button>
            </div>
          ))}
        </div>
        <NuevaRutaForm addDestino={addDestino} />
      </div>
    </div>
  )
}

function NuevaRutaForm({ addDestino }) {
  const toast = useToast()
  const [origen, setOrigen]   = useState('')
  const [destino, setDestino] = useState('')
  const [km, setKm]           = useState('')
  async function handleAdd() {
    if (!origen.trim() || !destino.trim()) return toast('Origen y Destino requeridos', 'err')
    try {
      await addDestino({ origen: origen.trim().toUpperCase(), destino: destino.trim().toUpperCase(), km: parseFloat(km)||0 })
      setOrigen(''); setDestino(''); setKm('')
      toast('Ruta agregada ✓', 'ok')
    } catch (err) { toast(err.message, 'err') }
  }
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
      <input value={origen} onChange={e => setOrigen(e.target.value)} placeholder="Origen (mina)" style={{ flex: 1, minWidth: 100 }} />
      <input value={destino} onChange={e => setDestino(e.target.value)} placeholder="Destino" style={{ flex: 1, minWidth: 100 }} />
      <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="KM" style={{ width: 70 }} />
      <button className="btn btn-out btn-sm" onClick={handleAdd}><i className="ti ti-plus" />Agregar</button>
    </div>
  )
}

// ══ USUARIOS ══
export function ViewUsuarios() {
  const { usuarios, addUsuario, updateUsuario, deleteUsuario, perm } = useApp()
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editU, setEditU]         = useState(null)
  const [nombre, setNom]          = useState('')
  const [email, setEmail]         = useState('')
  const [pass, setPass]           = useState('')
  const [sede, setSede]           = useState('México')
  const [rol, setRol]             = useState('checador')
  const [showPass, setShowPass]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const p = perm()
  const COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#A78BFA','#0891B2']
  const ROLES_LABELS = { admin: 'Administrador', contador: 'Contador', aux_contador: 'Aux. Contador', checador: 'Checador', supervisor: 'Supervisor' }

  function openNew() {
    setEditU(null); setNom(''); setEmail(''); setPass(''); setSede('México'); setRol('checador'); setShowPass(false); setShowModal(true)
  }
  function openEdit(u) {
    setEditU(u); setNom(u.nombre); setEmail(u.email); setPass(u.password_hash||''); setSede(u.sede||'México'); setRol(u.rol); setShowPass(false); setShowModal(true)
  }

  async function handleSave() {
    if (!nombre || !email) return toast('Nombre y correo requeridos', 'err')
    if (!pass || pass.length < 4) return toast('Contraseña mínimo 4 caracteres', 'err')
    const dup = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== editU?.id)
    if (dup) return toast('Ya existe un usuario con ese correo', 'err')
    setSaving(true)
    try {
      if (editU) {
        await updateUsuario(editU.id, { nombre, email: email.toLowerCase(), password_hash: pass, sede, rol })
        toast('Usuario actualizado ✓', 'ok')
      } else {
        await addUsuario({ nombre, email: email.toLowerCase(), password_hash: pass, sede, rol, color: COLORS[usuarios.length % 6] })
        toast('Usuario creado · Ya puede iniciar sesión', 'ok')
      }
      setShowModal(false)
    } catch (err) { toast(err.message, 'err') }
    setSaving(false)
  }

  async function handleDelete(u) {
    if (!window.confirm(`¿Eliminar a ${u.nombre}? No podrá iniciar sesión.`)) return
    try {
      await deleteUsuario(u.id)
      toast('Usuario desactivado', 'ok')
    } catch (err) { toast(err.message, 'err') }
  }

  const ini = n => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()

  if (!p.canTodo) return (
    <div className="empty"><i className="ti ti-lock" /><p>Solo el administrador puede gestionar usuarios</p></div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Solo los usuarios registrados aquí pueden acceder al sistema</div>
        <button className="btn btn-acc btn-sm" onClick={openNew}><i className="ti ti-plus" />Nuevo usuario</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10 }}>
        {usuarios.filter(u => u.activo !== false).map(u => (
          <div key={u.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: u.color||COLORS[0], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{ini(u.nombre)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
              <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 2, fontFamily: "'Space Mono',monospace" }}>
                {'•'.repeat(Math.min(u.password_hash?.length||0, 8))}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <span className="pill pa">{ROLES_LABELS[u.rol]||u.rol}</span>
                <span className="pill pgr">{u.sede}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
              <button className="btn btn-out btn-xs" onClick={() => openEdit(u)}><i className="ti ti-edit" />Editar</button>
              {u.email !== 'admin@catem.mx' && (
                <button className="btn btn-danger btn-xs" onClick={() => handleDelete(u)}><i className="ti ti-trash" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editU ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setShowModal(false)}
          footer={<><button className="btn btn-out" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-acc" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
          <div className="fg"><label>Nombre completo</label><input value={nombre} onChange={e => setNom(e.target.value)} placeholder="Juan Pérez" /></div>
          <div className="fg"><label>Correo / Usuario</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@catem.mx" /></div>
          <div className="fg">
            <label>Contraseña</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type={showPass ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} placeholder="Mínimo 4 caracteres" style={{ flex: 1 }} />
              <button type="button" className="btn btn-out" style={{ padding: '0 10px', flexShrink: 0 }} onClick={() => setShowPass(!showPass)}>
                <i className={`ti ti-eye${showPass ? '-off' : ''}`} style={{ fontSize: 15 }} />
              </button>
            </div>
          </div>
          <div className="row2">
            <div className="fg"><label>Sede</label><select value={sede} onChange={e => setSede(e.target.value)}><option>México</option><option>Tabasco</option><option>Veracruz</option><option>Monterrey</option><option>Campo</option></select></div>
            <div className="fg"><label>Rol</label><select value={rol} onChange={e => setRol(e.target.value)}><option value="admin">Administrador</option><option value="contador">Contador</option><option value="aux_contador">Aux. Contador</option><option value="checador">Checador</option><option value="supervisor">Supervisor</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ViewPagos
