import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalDetalleViaje from '../components/ModalDetalleViaje'

export default function ViewInformeSubagremiado({ agremiado, onBack }) {
  const { viajes, estimaciones, fmt, perm, reabrirViaje, config } = useApp()
  const [detalleViaje, setDetalleViaje] = useState(null)
  const [filtroFechaI, setFiltroFechaI] = useState('')
  const [filtroFechaF, setFiltroFechaF] = useState('')
  const p = perm()

  const tarifaCobro = config.tarifa_pago        // Lo que JSV cobra a Rocío (tarifa global pago = 2.30)
  const tarifaPago  = agremiado.tarifa_propia || config.tarifa_pago  // Lo que JSV le paga a Rocío (su tarifa propia = 1.80)

  const vs = viajes.filter(v => v.agremiado_id === agremiado.id)
  const filtered = vs.filter(v => {
    if (filtroFechaI && v.fecha_salida < filtroFechaI) return false
    if (filtroFechaF && v.fecha_salida > filtroFechaF) return false
    return true
  }).sort((a,b) => (b.fecha_salida||'').localeCompare(a.fecha_salida||''))

  // Calcular por gondola segun tarifa propia
  const calcCobro = (m3, km) => +(tarifaCobro * m3 * km).toFixed(2)  // lo que JSV cobra a Rocío
  const calcPago  = (m3, km) => +(tarifaPago  * m3 * km).toFixed(2)  // lo que JSV paga a Rocío
  const calcUtil  = (m3, km) => +((tarifaCobro - tarifaPago) * m3 * km).toFixed(2)  // ganancia JSV

  const getM3 = v => (v.m3_1||0) + (v.m3_2||0)

  const totalM3   = filtered.reduce((a,v) => a + getM3(v), 0)
  const totalCobro = filtered.reduce((a,v) => a + calcCobro(getM3(v), v.km||0), 0)
  const totalPago  = filtered.reduce((a,v) => a + calcPago(getM3(v), v.km||0), 0)
  const totalUtil  = totalCobro - totalPago

  function imprimir() {
    const rows = filtered.map(v => {
      const m3 = getM3(v)
      const km = v.km||0
      const est = estimaciones.find(e => e.id === v.estimacion_id)
      return `<tr>
        <td style="font-family:monospace;color:#b45309">${v.id}${v.folio2?'<br><span style="font-size:9px;color:#6b7280">'+v.folio2+'</span>':''}</td>
        <td>${v.tracto}</td>
        <td>${v.tipo.toUpperCase()}</td>
        <td style="text-align:right;font-family:monospace">${m3}</td>
        <td style="text-align:right;font-family:monospace">${km}</td>
        <td>${v.fecha_salida||'—'}</td>
        <td>${est?.id||'—'}</td>
        <td style="text-align:right;font-family:monospace;color:#166534">${fmt(calcCobro(m3,km))}</td>
        <td style="text-align:right;font-family:monospace;color:#1d4ed8">${fmt(calcPago(m3,km))}</td>
        <td style="text-align:right;font-family:monospace;color:#7c3aed">${fmt(calcUtil(m3,km))}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Informe ${agremiado.nombre}</title>
    <style>
      body{font-family:sans-serif;font-size:12px;margin:24px;color:#111}
      h1{font-size:18px;margin:0}
      .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:14px 0}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center}
      .kpi-l{font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700}
      .kpi-v{font-size:18px;font-weight:700;font-family:monospace;margin-top:3px}
      .tarifas{display:flex;gap:16px;font-size:11px;margin:10px 0;padding:8px 12px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
      th{background:#f3f4f6;padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:2px solid #e5e7eb}
      td{padding:5px 8px;border-bottom:1px solid #f3f4f6}
      tr:nth-child(even){background:#fafafa}
      .footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}
      @media print{body{margin:12px}}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div>
        <h1>Informe de pagos — ${agremiado.nombre}</h1>
        <div style="font-size:12px;color:#6b7280">Sub-agremiado · JSV Tracking · Julios Catem</div>
        ${filtroFechaI||filtroFechaF ? `<div style="font-size:11px;color:#6b7280">Periodo: ${filtroFechaI||'inicio'} → ${filtroFechaF||'hoy'}</div>` : ''}
      </div>
      <div style="text-align:right;font-size:11px;color:#6b7280">Generado: ${new Date().toLocaleDateString('es-MX')}</div>
    </div>

    <div class="tarifas">
      <span><b>Tarifa cobro (JSV cobra a ${agremiado.nombre}):</b> $${tarifaCobro}/m³/km</span>
      <span><b>Tarifa pago (JSV paga a ${agremiado.nombre}):</b> $${tarifaPago}/m³/km</span>
      <span><b>Diferencia (utilidad JSV):</b> $${(tarifaCobro-tarifaPago).toFixed(2)}/m³/km</span>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="kpi-l">Viajes</div><div class="kpi-v" style="color:#b45309">${filtered.length}</div></div>
      <div class="kpi"><div class="kpi-l">M³ Total</div><div class="kpi-v" style="color:#1d4ed8">${totalM3.toFixed(2)}</div></div>
      <div class="kpi"><div class="kpi-l">Cobro Total</div><div class="kpi-v" style="color:#166534;font-size:14px">${fmt(totalCobro)}</div></div>
      <div class="kpi"><div class="kpi-l">Pago a ${agremiado.nombre.split(' ')[0]}</div><div class="kpi-v" style="color:#1d4ed8;font-size:14px">${fmt(totalPago)}</div></div>
      <div class="kpi"><div class="kpi-l">Utilidad JSV</div><div class="kpi-v" style="color:#7c3aed;font-size:14px">${fmt(totalUtil)}</div></div>
    </div>

    <table>
      <thead><tr><th>Ticket</th><th>Tracto</th><th>Tipo</th><th>M³</th><th>KM</th><th>Fecha sal.</th><th>Estimación</th><th>Cobro</th><th>Pago a ${agremiado.nombre.split(' ')[0]}</th><th>Util. JSV</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="font-weight:700;background:#f3f4f6">
          <td colspan="3">TOTALES</td>
          <td style="text-align:right;font-family:monospace">${totalM3.toFixed(2)}</td>
          <td></td><td></td><td></td>
          <td style="text-align:right;font-family:monospace;color:#166534">${fmt(totalCobro)}</td>
          <td style="text-align:right;font-family:monospace;color:#1d4ed8">${fmt(totalPago)}</td>
          <td style="text-align:right;font-family:monospace;color:#7c3aed">${fmt(totalUtil)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="footer">JSV Tracking · julios-catem.vercel.app</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button className="btn btn-out btn-sm" onClick={onBack}>
          <i className="ti ti-arrow-left" />{agremiado.nombre}
        </button>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>Informe de pagos — {agremiado.nombre}</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Sub-agremiado · Tarifa cobro: ${tarifaCobro}/m³/km · Tarifa pago: ${tarifaPago}/m³/km</div>
        </div>
      </div>

      {/* Tarifas */}
      <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ background:'rgba(22,101,52,.1)', border:'1px solid rgba(22,101,52,.3)', borderRadius:8, padding:'8px 14px', fontSize:11 }}>
          <div style={{ fontSize:9, textTransform:'uppercase', color:'var(--muted)', fontWeight:700 }}>JSV cobra a {agremiado.nombre.split(' ')[0]}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:'var(--ok)' }}>${tarifaCobro}/m³/km</div>
        </div>
        <div style={{ background:'rgba(29,78,216,.1)', border:'1px solid rgba(29,78,216,.3)', borderRadius:8, padding:'8px 14px', fontSize:11 }}>
          <div style={{ fontSize:9, textTransform:'uppercase', color:'var(--muted)', fontWeight:700 }}>JSV paga a {agremiado.nombre.split(' ')[0]}</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:'var(--info)' }}>${tarifaPago}/m³/km</div>
        </div>
        <div style={{ background:'rgba(124,58,237,.1)', border:'1px solid rgba(124,58,237,.3)', borderRadius:8, padding:'8px 14px', fontSize:11 }}>
          <div style={{ fontSize:9, textTransform:'uppercase', color:'var(--muted)', fontWeight:700 }}>Diferencia (utilidad JSV)</div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:'#A855F7' }}>${(tarifaCobro-tarifaPago).toFixed(2)}/m³/km</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis kpis-4" style={{ marginBottom:14 }}>
        <div className="kpi"><div className="kpi-l">Viajes</div><div className="kpi-v" style={{color:'var(--acc)'}}>{filtered.length}</div></div>
        <div className="kpi"><div className="kpi-l">M³ Total</div><div className="kpi-v" style={{color:'var(--info)'}}>{totalM3.toFixed(2)}</div></div>
        <div className="kpi"><div className="kpi-l">Cobro total</div><div className="kpi-v" style={{color:'var(--ok)',fontSize:14}}>{fmt(totalCobro)}</div></div>
        <div className="kpi"><div className="kpi-l">Pago a {agremiado.nombre.split(' ')[0]}</div><div className="kpi-v" style={{color:'var(--info)',fontSize:14}}>{fmt(totalPago)}</div></div>
        <div className="kpi"><div className="kpi-l">Utilidad JSV</div><div className="kpi-v" style={{color:'#A855F7',fontSize:14}}>{fmt(totalUtil)}</div></div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <input type="date" value={filtroFechaI} onChange={e=>setFiltroFechaI(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} title="Desde" />
        <span style={{fontSize:11,color:'var(--muted)'}}>→</span>
        <input type="date" value={filtroFechaF} onChange={e=>setFiltroFechaF(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} title="Hasta" />
        <div style={{flex:1}} />
        <button className="btn btn-ok btn-sm" onClick={imprimir}><i className="ti ti-printer"/>Imprimir informe</button>
      </div>

      {/* Lista */}
      <div className="tc">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>TICKET</th><th>TRACTO</th><th>TIPO</th><th>M³</th><th>KM</th>
                <th>FECHA SAL.</th><th>ESTIMACIÓN</th>
                <th style={{textAlign:'right'}}>COBRO</th>
                <th style={{textAlign:'right'}}>PAGO A {agremiado.nombre.split(' ')[0].toUpperCase()}</th>
                <th style={{textAlign:'right'}}>UTIL. JSV</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map(v => {
                const m3 = getM3(v), km = v.km||0
                const est = estimaciones.find(e => e.id === v.estimacion_id)
                return (
                  <tr key={v.id} className="tr" onClick={() => setDetalleViaje(v)} style={{cursor:'pointer'}}>
                    <td>
                      <span className="mono" style={{color:'var(--acc)',fontWeight:700}}>{v.id}</span>
                      {v.folio2 && <div className="mono" style={{fontSize:9,color:'var(--muted)'}}>{v.folio2}</div>}
                    </td>
                    <td className="mono">{v.tracto}</td>
                    <td><Pill s={v.tipo}/></td>
                    <td className="mono">{m3}</td>
                    <td className="mono">{km}</td>
                    <td style={{fontSize:11}}>{v.fecha_salida||'—'}</td>
                    <td style={{fontSize:10,color:'var(--acc)'}}>{est?.id||'—'}</td>
                    <td className="mono" style={{textAlign:'right',color:'var(--ok)'}}>{fmt(calcCobro(m3,km))}</td>
                    <td className="mono" style={{textAlign:'right',color:'var(--info)',fontWeight:700}}>{fmt(calcPago(m3,km))}</td>
                    <td className="mono" style={{textAlign:'right',color:'#A855F7'}}>{fmt(calcUtil(m3,km))}</td>
                    <td><Pill s={v.estado}/></td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={11} style={{textAlign:'center',padding:24,color:'var(--muted)'}}>Sin viajes en ese periodo</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{fontWeight:700, background:'var(--bg3)'}}>
                  <td colSpan={3} style={{padding:'8px 10px',fontSize:11}}>TOTALES</td>
                  <td className="mono" style={{padding:'8px 10px'}}>{totalM3.toFixed(2)}</td>
                  <td colSpan={3} />
                  <td className="mono" style={{padding:'8px 10px',textAlign:'right',color:'var(--ok)'}}>{fmt(totalCobro)}</td>
                  <td className="mono" style={{padding:'8px 10px',textAlign:'right',color:'var(--info)'}}>{fmt(totalPago)}</td>
                  <td className="mono" style={{padding:'8px 10px',textAlign:'right',color:'#A855F7'}}>{fmt(totalUtil)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {detalleViaje && <ModalDetalleViaje viaje={detalleViaje} onClose={() => setDetalleViaje(null)} onReabrir={id => { reabrirViaje(id); setDetalleViaje(null) }} />}
    </div>
  )
}
