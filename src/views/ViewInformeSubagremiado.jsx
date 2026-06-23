import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalDetalleViaje from '../components/ModalDetalleViaje'
import { useToast } from '../components/Toast'

export default function ViewInformeSubagremiado({ agremiado, onBack }) {
  const { viajes, estimaciones, pagosRocio, addPagoRocio, deletePagoRocio,
          fmt, perm, reabrirViaje, config, today } = useApp()
  const toast = useToast()
  const [detalleViaje, setDetalleViaje] = useState(null)
  const [filtroFechaI, setFiltroFechaI] = useState('')
  const [filtroFechaF, setFiltroFechaF] = useState('')
  const [modalPago, setModalPago] = useState(null) // { viaje, tipo }
  const [saving, setSaving] = useState(false)

  // Form del modal de pago
  const [formFecha, setFormFecha]   = useState(today())
  const [formTipo, setFormTipo]     = useState('carga')
  const [formMontoDM, setFormMontoDM] = useState('')
  const [formMontoAG, setFormMontoAG] = useState('')
  const [formNotas, setFormNotas]   = useState('')

  const tarifaCobro = config.tarifa_pago          // $2.30 — lo que JSV cobra a Rocío
  const tarifaPago  = agremiado.tarifa_propia || config.tarifa_pago  // $1.80 — lo que JSV paga a Rocío

  const vs = viajes.filter(v => v.agremiado_id === agremiado.id)
  const filtered = vs.filter(v => {
    if (filtroFechaI && v.fecha_salida < filtroFechaI) return false
    if (filtroFechaF && v.fecha_salida > filtroFechaF) return false
    return true
  }).sort((a,b) => (b.fecha_salida||'').localeCompare(a.fecha_salida||''))

  const getM3 = v => (v.m3_1||0) + (v.m3_2||0)
  const calcCobro = (m3, km) => +(tarifaCobro * m3 * km).toFixed(2)
  const calcPago  = (m3, km) => +(tarifaPago  * m3 * km).toFixed(2)
  const calcUtil  = (m3, km) => +((tarifaCobro - tarifaPago) * m3 * km).toFixed(2)

  const getPagosViaje = viajeId => pagosRocio.filter(p => p.viaje_id === viajeId)

  const totalM3    = filtered.reduce((a,v) => a + getM3(v), 0)
  const totalCobro = filtered.reduce((a,v) => a + calcCobro(getM3(v), v.km||0), 0)
  const totalPago  = filtered.reduce((a,v) => a + calcPago(getM3(v), v.km||0), 0)
  const totalUtil  = totalCobro - totalPago

  // Totales por socio
  const totalPagadoDM = filtered.reduce((a,v) => {
    return a + getPagosViaje(v.id).reduce((b,p) => b + (p.monto_dm||0), 0)
  }, 0)
  const totalPagadoAG = filtered.reduce((a,v) => {
    return a + getPagosViaje(v.id).reduce((b,p) => b + (p.monto_ag||0), 0)
  }, 0)
  const totalPagado = totalPagadoDM + totalPagadoAG
  const saldo = totalPago - totalPagado

  function abrirModalPago(viaje) {
    setModalPago(viaje)
    setFormFecha(today())
    setFormTipo('carga')
    const mitad = (calcPago(getM3(viaje), viaje.km||0) / 2).toFixed(2)
    setFormMontoDM(mitad)
    setFormMontoAG(mitad)
    setFormNotas('')
  }

  async function handleGuardarPago() {
    const dm = parseFloat(formMontoDM) || 0
    const ag = parseFloat(formMontoAG) || 0
    if (!dm && !ag) return toast('Ingresa al menos un monto', 'err')
    setSaving(true)
    try {
      await addPagoRocio({
        viaje_id: modalPago.id,
        tipo: formTipo,
        fecha: formFecha,
        monto_dm: dm,
        monto_ag: ag,
        notas: formNotas || null,
      })
      toast('Pago registrado ✓', 'ok')
      setModalPago(null)
    } catch (err) { toast(err.message, 'err') }
    finally { setSaving(false) }
  }

  async function handleEliminarPago(id) {
    if (!confirm('¿Eliminar este registro de pago?')) return
    try { await deletePagoRocio(id); toast('Eliminado', 'ok') }
    catch (err) { toast(err.message, 'err') }
  }

  function imprimir() {
    const rows = filtered.map(v => {
      const m3 = getM3(v), km = v.km||0
      const ps = getPagosViaje(v.id)
      const pagDM = ps.reduce((a,p)=>a+(p.monto_dm||0),0)
      const pagAG = ps.reduce((a,p)=>a+(p.monto_ag||0),0)
      const est = estimaciones.find(e => e.id === v.estimacion_id)
      return `<tr>
        <td style="font-family:monospace;color:#b45309;font-size:10px">${v.id}${v.folio2?'<br>'+v.folio2:''}</td>
        <td>${v.tracto}</td>
        <td style="text-align:right;font-family:monospace">${m3}</td>
        <td style="text-align:right;font-family:monospace">${km}</td>
        <td>${v.fecha_salida||'—'}</td>
        <td>${est?.id||'—'}</td>
        <td style="text-align:right;font-family:monospace;color:#166534">${fmt(calcCobro(m3,km))}</td>
        <td style="text-align:right;font-family:monospace;color:#1d4ed8">${fmt(calcPago(m3,km))}</td>
        <td style="text-align:right;font-family:monospace;color:#7c3aed">${fmt(calcUtil(m3,km))}</td>
        <td style="text-align:right;font-family:monospace">${fmt(pagDM)}</td>
        <td style="text-align:right;font-family:monospace">${fmt(pagAG)}</td>
        <td style="text-align:right;font-family:monospace;color:${calcPago(m3,km)-(pagDM+pagAG)>0?'#991b1b':'#166534'}">${fmt(calcPago(m3,km)-(pagDM+pagAG))}</td>
      </tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe ${agremiado.nombre}</title>
    <style>
      body{font-family:sans-serif;font-size:11px;margin:20px;color:#111}
      h1{font-size:16px;margin:0}
      .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:12px 0}
      .kpi{border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:center}
      .kpi-l{font-size:8px;color:#6b7280;text-transform:uppercase;font-weight:700}
      .kpi-v{font-size:14px;font-weight:700;font-family:monospace;margin-top:2px}
      .tarifas{font-size:10px;padding:6px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin:8px 0;display:flex;gap:20px}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{background:#f3f4f6;padding:4px 6px;text-align:left;font-size:9px;text-transform:uppercase;border-bottom:2px solid #e5e7eb}
      td{padding:4px 6px;border-bottom:1px solid #f3f4f6}
      tfoot td{font-weight:700;background:#f3f4f6}
      .footer{margin-top:16px;font-size:9px;color:#9ca3af;text-align:center}
      @media print{body{margin:10px}}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;margin-bottom:10px">
      <div><h1>Informe interno — ${agremiado.nombre}</h1>
      <div style="color:#6b7280;font-size:11px">CONFIDENCIAL · Solo uso interno JSV${filtroFechaI||filtroFechaF?` · Periodo: ${filtroFechaI||'inicio'} → ${filtroFechaF||'hoy'}`:''}</div></div>
      <div style="text-align:right;font-size:10px;color:#6b7280">${new Date().toLocaleDateString('es-MX')}</div>
    </div>
    <div class="tarifas">
      <span><b>JSV cobra a ${agremiado.nombre.split(' ')[0]}:</b> $${tarifaCobro}/m³/km</span>
      <span><b>JSV paga a ${agremiado.nombre.split(' ')[0]}:</b> $${tarifaPago}/m³/km</span>
      <span><b>Diferencia:</b> $${(tarifaCobro-tarifaPago).toFixed(2)}/m³/km</span>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-l">Viajes</div><div class="kpi-v" style="color:#b45309">${filtered.length}</div></div>
      <div class="kpi"><div class="kpi-l">M³</div><div class="kpi-v" style="color:#1d4ed8">${totalM3.toFixed(2)}</div></div>
      <div class="kpi"><div class="kpi-l">Cobro total</div><div class="kpi-v" style="color:#166534;font-size:11px">${fmt(totalCobro)}</div></div>
      <div class="kpi"><div class="kpi-l">Pago total</div><div class="kpi-v" style="color:#1d4ed8;font-size:11px">${fmt(totalPago)}</div></div>
      <div class="kpi"><div class="kpi-l">Pagado DM</div><div class="kpi-v" style="color:#166534;font-size:11px">${fmt(totalPagadoDM)}</div></div>
      <div class="kpi"><div class="kpi-l">Pagado AG</div><div class="kpi-v" style="color:#166534;font-size:11px">${fmt(totalPagadoAG)}</div></div>
    </div>
    <table>
      <thead><tr><th>Ticket</th><th>Tracto</th><th>M³</th><th>KM</th><th>Fecha</th><th>Est.</th>
      <th>Cobro</th><th>A pagar</th><th>Util.JSV</th><th>DM pagó</th><th>AG pagó</th><th>Saldo</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="2">TOTALES</td>
        <td style="text-align:right;font-family:monospace">${totalM3.toFixed(2)}</td>
        <td colspan="3"></td>
        <td style="text-align:right;font-family:monospace;color:#166534">${fmt(totalCobro)}</td>
        <td style="text-align:right;font-family:monospace;color:#1d4ed8">${fmt(totalPago)}</td>
        <td style="text-align:right;font-family:monospace;color:#7c3aed">${fmt(totalUtil)}</td>
        <td style="text-align:right;font-family:monospace">${fmt(totalPagadoDM)}</td>
        <td style="text-align:right;font-family:monospace">${fmt(totalPagadoAG)}</td>
        <td style="text-align:right;font-family:monospace;color:${saldo>0?'#991b1b':'#166534'}">${fmt(saldo)}</td>
      </tr></tfoot>
    </table>
    <div class="footer">CONFIDENCIAL · JSV Tracking · julios-catem.vercel.app</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const w = window.open('','_blank'); w.document.write(html); w.document.close()
  }

  const tipoLabel = { carga:'Al cargar (50%)', liquidacion:'Al liquidar (50%)', adelanto:'Adelanto / Abono' }
  const tipoColor = { carga:'var(--info)', liquidacion:'var(--ok)', adelanto:'var(--warn)' }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <button className="btn btn-out btn-sm" onClick={onBack}>
          <i className="ti ti-arrow-left" />{agremiado.nombre}
        </button>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>Informe interno — {agremiado.nombre}</div>
          <div style={{ fontSize:11, color:'var(--muted)' }}>
            JSV cobra: ${tarifaCobro}/m³/km · JSV paga: ${tarifaPago}/m³/km · Diferencia: ${(tarifaCobro-tarifaPago).toFixed(2)}/m³/km
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8, marginBottom:14 }}>
        {[
          { l:'Viajes', v:filtered.length, c:'var(--acc)' },
          { l:'M³ Total', v:totalM3.toFixed(2), c:'var(--info)' },
          { l:'Cobro total', v:fmt(totalCobro), c:'var(--ok)', sm:true },
          { l:'A pagar', v:fmt(totalPago), c:'var(--info)', sm:true },
          { l:'Util. JSV', v:fmt(totalUtil), c:'#A855F7', sm:true },
          { l:'Pagado DM', v:fmt(totalPagadoDM), c:'var(--ok)', sm:true },
          { l:'Pagado AG', v:fmt(totalPagadoAG), c:'var(--ok)', sm:true },
          { l:'Saldo pendiente', v:fmt(saldo), c:saldo>0?'var(--err)':'var(--ok)', sm:true },
        ].map(k => (
          <div key={k.l} className="kpi">
            <div className="kpi-l">{k.l}</div>
            <div className="kpi-v" style={{ color:k.c, fontSize:k.sm?14:22 }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <input type="date" value={filtroFechaI} onChange={e=>setFiltroFechaI(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} />
        <span style={{fontSize:11,color:'var(--muted)'}}>→</span>
        <input type="date" value={filtroFechaF} onChange={e=>setFiltroFechaF(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} />
        <div style={{flex:1}} />
        <button className="btn btn-ok btn-sm" onClick={imprimir}><i className="ti ti-printer"/>Imprimir informe</button>
      </div>

      {/* Viajes */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.length ? filtered.map(v => {
          const m3 = getM3(v), km = v.km||0
          const cobro = calcCobro(m3, km)
          const aPagar = calcPago(m3, km)
          const util = calcUtil(m3, km)
          const ps = getPagosViaje(v.id)
          const pagadoDM = ps.reduce((a,p)=>a+(p.monto_dm||0),0)
          const pagadoAG = ps.reduce((a,p)=>a+(p.monto_ag||0),0)
          const pagadoTotal = pagadoDM + pagadoAG
          const saldoV = aPagar - pagadoTotal
          const est = estimaciones.find(e => e.id === v.estimacion_id)

          return (
            <div key={v.id} style={{ background:'var(--bg2)', border:`1px solid ${saldoV>0?'rgba(239,68,68,.3)':'var(--border)'}`, borderRadius:10, overflow:'hidden' }}>
              {/* Header del viaje */}
              <div style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                onClick={() => setDetalleViaje(v)}>
                <div>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:13, fontWeight:700, color:'var(--acc)' }}>{v.id}</span>
                  {v.folio2 && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--muted)', marginLeft:8 }}>/ {v.folio2}</span>}
                  <div style={{ display:'flex', gap:6, marginTop:4 }}>
                    <Pill s={v.tipo} /><Pill s={v.estado} />
                    {est && <span className="pill pa" style={{fontSize:9}}>{est.id}</span>}
                  </div>
                  <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>
                    {v.tracto} · {v.fecha_salida||'—'} · {m3} m³ · {km} km
                  </div>
                </div>
                {/* Montos */}
                <div style={{ textAlign:'right', fontSize:11 }}>
                  <div style={{ display:'flex', gap:12 }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'var(--muted)' }}>COBRO</div>
                      <div style={{ fontFamily:"'Space Mono',monospace", color:'var(--ok)', fontWeight:700 }}>{fmt(cobro)}</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'var(--muted)' }}>A PAGAR</div>
                      <div style={{ fontFamily:"'Space Mono',monospace", color:'var(--info)', fontWeight:700 }}>{fmt(aPagar)}</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:9, color:'var(--muted)' }}>UTIL. JSV</div>
                      <div style={{ fontFamily:"'Space Mono',monospace", color:'#A855F7', fontWeight:700 }}>{fmt(util)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagos registrados */}
              <div style={{ padding:'8px 14px', background:'var(--bg3)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase' }}>
                    Pagos a {agremiado.nombre.split(' ')[0]}
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ fontSize:10 }}>
                      <span style={{ color:'var(--muted)' }}>DM: </span>
                      <span style={{ fontFamily:"'Space Mono',monospace", color:'var(--ok)' }}>{fmt(pagadoDM)}</span>
                      <span style={{ color:'var(--muted)', marginLeft:8 }}>AG: </span>
                      <span style={{ fontFamily:"'Space Mono',monospace", color:'var(--ok)' }}>{fmt(pagadoAG)}</span>
                      <span style={{ color:'var(--muted)', marginLeft:8 }}>Saldo: </span>
                      <span style={{ fontFamily:"'Space Mono',monospace", color:saldoV>0?'var(--err)':'var(--ok)', fontWeight:700 }}>{fmt(saldoV)}</span>
                    </div>
                    <button className="btn btn-ok btn-xs" onClick={() => abrirModalPago(v)}>
                      <i className="ti ti-plus" />Registrar pago
                    </button>
                  </div>
                </div>

                {ps.length > 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {ps.map(p => (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 8px', background:'var(--bg2)', borderRadius:6, fontSize:11 }}>
                        <span style={{ fontSize:9, fontWeight:700, color:tipoColor[p.tipo]||'var(--muted)', textTransform:'uppercase', minWidth:80 }}>{tipoLabel[p.tipo]||p.tipo}</span>
                        <span style={{ color:'var(--muted)', fontSize:10 }}>{p.fecha}</span>
                        {p.monto_dm > 0 && <span>DM: <b style={{ fontFamily:"'Space Mono',monospace", color:'var(--ok)' }}>{fmt(p.monto_dm)}</b></span>}
                        {p.monto_ag > 0 && <span>AG: <b style={{ fontFamily:"'Space Mono',monospace", color:'var(--ok)' }}>{fmt(p.monto_ag)}</b></span>}
                        {p.notas && <span style={{ color:'var(--muted)', fontStyle:'italic', flex:1 }}>{p.notas}</span>}
                        <button className="btn btn-danger btn-xs" style={{ marginLeft:'auto' }} onClick={() => handleEliminarPago(p.id)}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:10, color:'var(--muted)', fontStyle:'italic' }}>Sin pagos registrados</div>
                )}
              </div>
            </div>
          )
        }) : (
          <div style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>Sin viajes en ese periodo</div>
        )}
      </div>

      {/* Modal registrar pago */}
      {modalPago && (
        <div className="ov" onClick={e => e.target.classList.contains('ov') && setModalPago(null)}>
          <div className="modal" style={{ width:420 }}>
            <div className="mh">
              <div>
                <div style={{ fontWeight:700 }}>Registrar pago a {agremiado.nombre.split(' ')[0]}</div>
                <div style={{ fontSize:11, color:'var(--muted)' }}>{modalPago.id} · Total a pagar: {fmt(calcPago(getM3(modalPago), modalPago.km||0))}</div>
              </div>
              <button className="mx" onClick={() => setModalPago(null)}>×</button>
            </div>
            <div className="mb">
              <div className="row2">
                <div className="fg">
                  <label>Tipo de pago</label>
                  <select value={formTipo} onChange={e=>setFormTipo(e.target.value)}>
                    <option value="carga">Al cargar (50%)</option>
                    <option value="liquidacion">Al liquidar (50%)</option>
                    <option value="adelanto">Adelanto / Abono</option>
                  </select>
                </div>
                <div className="fg">
                  <label>Fecha</label>
                  <input type="date" value={formFecha} onChange={e=>setFormFecha(e.target.value)} />
                </div>
              </div>

              {/* Montos por socio */}
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', marginTop:8 }}>
                <div style={{ fontSize:11, fontWeight:700, marginBottom:8, color:'var(--muted)' }}>¿Quién paga y cuánto?</div>
                <div className="row2">
                  <div className="fg">
                    <label style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ background:'var(--info)', color:'#fff', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:700 }}>DM</span>
                      Monto DM
                    </label>
                    <input type="number" value={formMontoDM} onChange={e=>setFormMontoDM(e.target.value)} placeholder="0.00" step="0.01" min="0" />
                  </div>
                  <div className="fg">
                    <label style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ background:'#A855F7', color:'#fff', borderRadius:4, padding:'1px 6px', fontSize:10, fontWeight:700 }}>AG</span>
                      Monto AG
                    </label>
                    <input type="number" value={formMontoAG} onChange={e=>setFormMontoAG(e.target.value)} placeholder="0.00" step="0.01" min="0" />
                  </div>
                </div>
                {(parseFloat(formMontoDM)||0)+(parseFloat(formMontoAG)||0) > 0 && (
                  <div style={{ fontSize:11, marginTop:6, color:'var(--muted)' }}>
                    Total: <b style={{ fontFamily:"'Space Mono',monospace", color:'var(--ok)' }}>{fmt((parseFloat(formMontoDM)||0)+(parseFloat(formMontoAG)||0))}</b>
                    <button type="button" style={{ marginLeft:12, fontSize:10, background:'none', border:'none', color:'var(--info)', cursor:'pointer', textDecoration:'underline' }}
                      onClick={() => { const m=(calcPago(getM3(modalPago),modalPago.km||0)/2).toFixed(2); setFormMontoDM(m); setFormMontoAG(m) }}>
                      Dividir 50/50
                    </button>
                  </div>
                )}
              </div>

              <div className="fg" style={{ marginTop:8 }}>
                <label>Notas <span style={{ fontWeight:400, fontSize:9, color:'var(--muted)' }}>(opcional)</span></label>
                <input value={formNotas} onChange={e=>setFormNotas(e.target.value)} placeholder="Ej: Adelanto por descompostura en camino..." />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-out" onClick={() => setModalPago(null)}>Cancelar</button>
              <button className="btn btn-ok" onClick={handleGuardarPago} disabled={saving}>
                <i className="ti ti-device-floppy" />{saving?'Guardando...':'Guardar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleViaje && <ModalDetalleViaje viaje={detalleViaje} onClose={() => setDetalleViaje(null)} onReabrir={id => { reabrirViaje(id); setDetalleViaje(null) }} />}
    </div>
  )
}
