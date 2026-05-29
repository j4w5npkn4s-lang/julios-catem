import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'

export default function DashboardFinanciero() {
  const { viajes, agremiados, vCobro, vPago, vM3, fmt } = useApp()

  const hoy = new Date().toISOString().split('T')[0]
  const [filtro, setFiltro]   = useState('todo')
  const [fechaI, setFechaI]   = useState('')
  const [fechaF, setFechaF]   = useState(hoy)
  const [fAgr, setFAgr]       = useState('')
  const [fTipo, setFTipo]     = useState('')

  // Periodo rápido
  function setPeriodo(p) {
    const hoy = new Date()
    const f = d => d.toISOString().split('T')[0]
    setFiltro(p)
    if (p === 'hoy')     { setFechaI(f(hoy));                            setFechaF(f(hoy)) }
    if (p === 'semana')  { const d = new Date(hoy); d.setDate(d.getDate()-7);   setFechaI(f(d)); setFechaF(f(hoy)) }
    if (p === 'mes')     { const d = new Date(hoy); d.setDate(1);               setFechaI(f(d)); setFechaF(f(hoy)) }
    if (p === 'mes_ant') {
      const d1 = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1)
      const d2 = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      setFechaI(f(d1)); setFechaF(f(d2))
    }
    if (p === 'todo')    { setFechaI(''); setFechaF('') }
  }

  // Filtrar viajes
  const filtered = viajes.filter(v => {
    if (v.incidente) return false // excluir accidentados/robados
    if (fechaI && v.fecha_salida < fechaI) return false
    if (fechaF && v.fecha_salida > fechaF) return false
    if (fAgr  && v.agremiado_id !== fAgr) return false
    if (fTipo && v.tipo !== fTipo) return false
    return true
  })

  // Totales
  const totalViajes  = filtered.length
  const totalM3      = filtered.reduce((a,v) => a + vM3(v), 0)
  const totalCobro   = filtered.reduce((a,v) => a + vCobro(v), 0)
  const totalPago    = filtered.reduce((a,v) => a + vPago(v), 0)
  const totalUtil    = totalCobro - totalPago
  const sencillos    = filtered.filter(v => v.tipo === 'sencillo').length
  const fulls        = filtered.filter(v => v.tipo === 'full').length
  const pagados      = filtered.filter(v => v.pagado === true).length
  const sinPagar     = filtered.filter(v => !v.pagado).length
  const cerrados     = filtered.filter(v => v.estado === 'cerrado').length
  const abiertos     = filtered.filter(v => v.estado === 'abierto').length

  // Por agremiado
  const porAgremiado = agremiados.filter(a => a.activo !== false).map(a => {
    const vs = filtered.filter(v => v.agremiado_id === a.id)
    const m3  = vs.reduce((x,v) => x + vM3(v), 0)
    const cob = vs.reduce((x,v) => x + vCobro(v), 0)
    const pag = vs.reduce((x,v) => x + vPago(v), 0)
    return { ...a, viajes: vs.length, m3, cobro: cob, pago: pag, util: cob-pag }
  }).filter(a => a.viajes > 0).sort((a,b) => b.cobro - a.cobro)

  return (
    <div>
      {/* Filtros periodo */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="dtabs" style={{ marginBottom: 0 }}>
          {[
            { k:'todo',     l:'Todo' },
            { k:'hoy',      l:'Hoy' },
            { k:'semana',   l:'7 días' },
            { k:'mes',      l:'Este mes' },
            { k:'mes_ant',  l:'Mes anterior' },
            { k:'custom',   l:'Personalizado' },
          ].map(b => (
            <button key={b.k} className={`dtab${filtro===b.k?' active':''}`} onClick={() => setPeriodo(b.k)}>{b.l}</button>
          ))}
        </div>
        {filtro === 'custom' && (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input type="date" value={fechaI} onChange={e => setFechaI(e.target.value)}
              style={{ height:30, fontSize:11, padding:'0 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} />
            <span style={{ color:'var(--muted)', fontSize:11 }}>→</span>
            <input type="date" value={fechaF} onChange={e => setFechaF(e.target.value)}
              style={{ height:30, fontSize:11, padding:'0 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} />
          </div>
        )}
        <select value={fAgr} onChange={e => setFAgr(e.target.value)}
          style={{ height:30, fontSize:11, padding:'0 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)', minWidth:140 }}>
          <option value="">Todos los agremiados</option>
          {agremiados.filter(a=>a.activo!==false).map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)}
          style={{ height:30, fontSize:11, padding:'0 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }}>
          <option value="">Sencillo + Full</option>
          <option value="sencillo">Solo Sencillos</option>
          <option value="full">Solo Full</option>
        </select>
      </div>

      {/* KPIs principales */}
      <div className="kpis kpis-4" style={{ marginBottom: 10 }}>
        <div className="kpi acc"><div className="kpi-l">Total viajes</div><div className="kpi-v">{totalViajes}</div><div className="kpi-s">{sencillos} senc · {fulls} full</div></div>
        <div className="kpi"><div className="kpi-l">M³ Total</div><div className="kpi-v" style={{ color:'var(--info)' }}>{totalM3.toFixed(2)}</div><div className="kpi-s">metros cúbicos</div></div>
        <div className="kpi grn"><div className="kpi-l">Cobro total</div><div className="kpi-v">{fmt(totalCobro)}</div><div className="kpi-s">A la empresa</div></div>
        <div className="kpi red"><div className="kpi-l">Pago total</div><div className="kpi-v">{fmt(totalPago)}</div><div className="kpi-s">A camioneros</div></div>
      </div>

      {/* Utilidades */}
      <div className="split" style={{ marginBottom: 14 }}>
        <div className="spi">
          <div className="spl">UTILIDAD TOTAL</div>
          <div className="spv" style={{ fontSize: 22 }}>{fmt(totalUtil)}</div>
        </div>
        <div className="spi" style={{ borderLeft:'1px solid var(--border)' }}>
          <div className="spl">CATEM (50%)</div>
          <div className="spv">{fmt(totalUtil/2)}</div>
        </div>
        <div className="spi" style={{ borderLeft:'1px solid var(--border)' }}>
          <div className="spl">JSV (50%)</div>
          <div className="spv">{fmt(totalUtil/2)}</div>
        </div>
      </div>

      {/* Estado de pagos */}
      <div className="kpis kpis-4" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="kpi-l">Pagados</div><div className="kpi-v" style={{ color:'var(--ok)' }}>{pagados}</div><div className="kpi-s">Liquidados</div></div>
        <div className="kpi"><div className="kpi-l">Sin pagar</div><div className="kpi-v" style={{ color:'var(--err)' }}>{sinPagar}</div><div className="kpi-s">Pendientes</div></div>
        <div className="kpi"><div className="kpi-l">Cerrados</div><div className="kpi-v" style={{ color:'var(--ok)' }}>{cerrados}</div><div className="kpi-s">Conciliados</div></div>
        <div className="kpi"><div className="kpi-l">En ruta</div><div className="kpi-v" style={{ color:'var(--acc)' }}>{abiertos}</div><div className="kpi-s">Abiertos</div></div>
      </div>

      {/* Por agremiado */}
      {porAgremiado.length > 0 && (
        <div className="tc">
          <div className="tc-h"><span className="tc-t">Resumen por agremiado</span></div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>AGREMIADO</th><th>VIAJES</th><th>M³</th>
                  <th>COBRO</th><th>PAGO</th><th>UTILIDAD</th>
                </tr>
              </thead>
              <tbody>
                {porAgremiado.map(a => (
                  <tr key={a.id} className="tr">
                    <td style={{ fontWeight: 600 }}>{a.nombre}</td>
                    <td className="mono" style={{ textAlign:'center' }}>{a.viajes}</td>
                    <td className="mono">{a.m3.toFixed(2)}</td>
                    <td className="mono" style={{ color:'var(--cobro)' }}>{fmt(a.cobro)}</td>
                    <td className="mono" style={{ color:'var(--pago)' }}>{fmt(a.pago)}</td>
                    <td className="mono" style={{ color:'var(--util)', fontWeight:700 }}>{fmt(a.util)}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ background:'var(--bg3)', fontWeight:700 }}>
                  <td>TOTAL</td>
                  <td className="mono" style={{ textAlign:'center' }}>{porAgremiado.reduce((a,x)=>a+x.viajes,0)}</td>
                  <td className="mono">{porAgremiado.reduce((a,x)=>a+x.m3,0).toFixed(2)}</td>
                  <td className="mono" style={{ color:'var(--cobro)' }}>{fmt(porAgremiado.reduce((a,x)=>a+x.cobro,0))}</td>
                  <td className="mono" style={{ color:'var(--pago)' }}>{fmt(porAgremiado.reduce((a,x)=>a+x.pago,0))}</td>
                  <td className="mono" style={{ color:'var(--util)', fontWeight:700 }}>{fmt(porAgremiado.reduce((a,x)=>a+x.util,0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
