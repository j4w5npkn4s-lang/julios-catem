import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalDetalleViaje from '../components/ModalDetalleViaje'
import { useToast } from '../components/Toast'

export default function ViewInformeSubagremiado({ agremiado, onBack }) {
  const { viajes, estimaciones, pagosRocio, addPagoRocio, deletePagoRocio,
          marcarCobradoSindicato, fmt, perm, reabrirViaje, config, today } = useApp()
  const toast = useToast()
  const [detalleViaje, setDetalleViaje]   = useState(null)
  const [filtroFechaI, setFiltroFechaI]   = useState('')
  const [filtroFechaF, setFiltroFechaF]   = useState('')
  const [modalPago, setModalPago]         = useState(null)
  const [saving, setSaving]               = useState(false)
  const [selecCobrados, setSelecCobrados] = useState(new Set())

  // Form pago
  const [formFecha,   setFormFecha]   = useState(today())
  const [formTipo,    setFormTipo]    = useState('carga')
  const [formMontoDM, setFormMontoDM] = useState('')
  const [formMontoAG, setFormMontoAG] = useState('')
  const [formNotas,   setFormNotas]   = useState('')

  const tarifaCobro = config.tarifa_pago
  const tarifaPago  = agremiado.tarifa_propia || config.tarifa_pago

  const vs = viajes.filter(v => v.agremiado_id === agremiado.id)
  const filtered = vs.filter(v => {
    if (filtroFechaI && v.fecha_salida < filtroFechaI) return false
    if (filtroFechaF && v.fecha_salida > filtroFechaF) return false
    return true
  }).sort((a,b) => (b.fecha_salida||'').localeCompare(a.fecha_salida||''))

  const cobrados   = filtered.filter(v => v.cobrado_sindicato)
  const pendientes = filtered.filter(v => !v.cobrado_sindicato)

  const getM3     = v => (v.m3_1||0) + (v.m3_2||0)
  const calcCobro = (m3,km) => +(tarifaCobro * m3 * km).toFixed(2)
  const calcPago  = (m3,km) => +(tarifaPago  * m3 * km).toFixed(2)
  const calcUtil  = (m3,km) => +((tarifaCobro - tarifaPago) * m3 * km).toFixed(2)
  const getPagosViaje = id => pagosRocio.filter(p => p.viaje_id === id)

  // Resumen de viajes seleccionados de "cobrados"
  const selecViajes = cobrados.filter(v => selecCobrados.has(v.id))
  const resumen = selecViajes.reduce((acc, v) => {
    const m3 = getM3(v), km = v.km||0
    const util = calcUtil(m3, km)
    const ps = getPagosViaje(v.id)
    const invDM = ps.reduce((a,p)=>a+(p.monto_dm||0),0)
    const invAG = ps.reduce((a,p)=>a+(p.monto_ag||0),0)
    return {
      util:  acc.util  + util,
      invDM: acc.invDM + invDM,
      invAG: acc.invAG + invAG,
      m3:    acc.m3    + m3,
    }
  }, { util:0, invDM:0, invAG:0, m3:0 })
  const totalDM = resumen.util/2 + resumen.invDM
  const totalAG = resumen.util/2 + resumen.invAG

  function toggleSelec(id) {
    const s = new Set(selecCobrados)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelecCobrados(s)
  }
  function toggleAllCobrados() {
    if (selecCobrados.size === cobrados.length) setSelecCobrados(new Set())
    else setSelecCobrados(new Set(cobrados.map(v=>v.id)))
  }

  async function handleMarcarCobrado(v, cobrado) {
    try {
      await marcarCobradoSindicato(v.id, cobrado)
      toast(cobrado ? 'Marcado como cobrado al sindicato ✓' : 'Desmarcado', 'ok')
      if (!cobrado) setSelecCobrados(s => { const n=new Set(s); n.delete(v.id); return n })
    } catch(err) { toast(err.message,'err') }
  }

  function abrirModalPago(viaje) {
    setModalPago(viaje)
    setFormFecha(today())
    setFormTipo('carga')
    const mitad = (calcPago(getM3(viaje), viaje.km||0)/2).toFixed(2)
    setFormMontoDM(mitad); setFormMontoAG(mitad); setFormNotas('')
  }

  async function handleGuardarPago() {
    const dm = parseFloat(formMontoDM)||0
    const ag = parseFloat(formMontoAG)||0
    if (!dm && !ag) return toast('Ingresa al menos un monto','err')
    setSaving(true)
    try {
      await addPagoRocio({ viaje_id:modalPago.id, tipo:formTipo, fecha:formFecha, monto_dm:dm, monto_ag:ag, notas:formNotas||null })
      toast('Pago registrado ✓','ok'); setModalPago(null)
    } catch(err) { toast(err.message,'err') }
    finally { setSaving(false) }
  }

  async function handleEliminarPago(id) {
    if (!confirm('¿Eliminar este registro de pago?')) return
    try { await deletePagoRocio(id); toast('Eliminado','ok') }
    catch(err) { toast(err.message,'err') }
  }

  const tipoLabel = { carga:'Al cargar', liquidacion:'Al liquidar', adelanto:'Adelanto/Abono' }
  const tipoColor = { carga:'var(--info)', liquidacion:'var(--ok)', adelanto:'#F59E0B' }

  const SectionTitle = ({ children, color, count }) => (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'18px 0 10px', borderBottom:`2px solid ${color}`, paddingBottom:6 }}>
      <div style={{ fontSize:13, fontWeight:700, color }}>{children}</div>
      {count !== undefined && <span style={{ background:color+'22', color, border:`1px solid ${color}44`, borderRadius:10, padding:'1px 8px', fontSize:11, fontWeight:700 }}>{count}</span>}
    </div>
  )

  const ViajeCard = ({ v, showCheck=false }) => {
    const m3=getM3(v), km=v.km||0
    const aPagar=calcPago(m3,km), util=calcUtil(m3,km)
    const ps=getPagosViaje(v.id)
    const pagDM=ps.reduce((a,p)=>a+(p.monto_dm||0),0)
    const pagAG=ps.reduce((a,p)=>a+(p.monto_ag||0),0)
    const saldoV=aPagar-(pagDM+pagAG)
    const est=estimaciones.find(e=>e.id===v.estimacion_id)
    const selected = selecCobrados.has(v.id)

    return (
      <div style={{ background:'var(--bg2)', border:`1px solid ${showCheck&&selected?'var(--acc)':saldoV>0?'rgba(239,68,68,.25)':'var(--border)'}`, borderRadius:10, overflow:'hidden', marginBottom:10 }}>
        <div style={{ padding:'10px 14px', display:'flex', gap:10, alignItems:'flex-start', borderBottom:'1px solid var(--border)' }}>
          {showCheck && (
            <div onClick={()=>toggleSelec(v.id)} style={{ width:22,height:22,borderRadius:5,border:`2px solid ${selected?'var(--acc)':'var(--border2)'}`,background:selected?'var(--acc)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>
              {selected && <i className="ti ti-check" style={{fontSize:13,color:'#000'}}/>}
            </div>
          )}
          <div style={{ flex:1, cursor:'pointer' }} onClick={()=>setDetalleViaje(v)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:13, fontWeight:700, color:'var(--acc)' }}>{v.id}</span>
                {v.folio2 && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--muted)', marginLeft:8 }}>/ {v.folio2}</span>}
                <div style={{ display:'flex', gap:5, marginTop:4 }}>
                  <Pill s={v.tipo}/><Pill s={v.estado}/>
                  {est && <span className="pill pa" style={{fontSize:9}}>{est.id}</span>}
                </div>
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>{v.tracto} · {v.fecha_salida||'—'} · {m3} m³ · {km} km</div>
              </div>
              <div style={{ display:'flex', gap:12, textAlign:'center' }}>
                <div><div style={{fontSize:9,color:'var(--muted)'}}>A PAGAR</div><div style={{fontFamily:"'Space Mono',monospace",color:'var(--info)',fontWeight:700}}>{fmt(aPagar)}</div></div>
                <div><div style={{fontSize:9,color:'var(--muted)'}}>UTIL. JSV</div><div style={{fontFamily:"'Space Mono',monospace",color:'#A855F7',fontWeight:700}}>{fmt(util)}</div></div>
                <div><div style={{fontSize:9,color:'var(--muted)'}}>SALDO</div><div style={{fontFamily:"'Space Mono',monospace",color:saldoV>0?'var(--err)':'var(--ok)',fontWeight:700}}>{fmt(saldoV)}</div></div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
            {!v.cobrado_sindicato
              ? <button className="btn btn-out btn-xs" onClick={()=>handleMarcarCobrado(v,true)} title="Marcar como cobrado al sindicato">
                  <i className="ti ti-circle-check"/>Marcar cobrado
                </button>
              : <button className="btn btn-danger btn-xs" onClick={()=>handleMarcarCobrado(v,false)} title="Desmarcar">
                  <i className="ti ti-circle-x"/>Desmarcar
                </button>
            }
            <button className="btn btn-ok btn-xs" onClick={()=>abrirModalPago(v)}>
              <i className="ti ti-plus"/>Registrar pago
            </button>
          </div>
        </div>

        {/* Pagos registrados */}
        <div style={{ padding:'8px 14px', background:'var(--bg3)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: ps.length?6:0 }}>
            <div style={{ fontSize:10, color:'var(--muted)' }}>
              DM pagó: <b style={{color:'var(--ok)',fontFamily:"'Space Mono',monospace"}}>{fmt(pagDM)}</b>
              <span style={{margin:'0 8px'}}>·</span>
              AG pagó: <b style={{color:'var(--ok)',fontFamily:"'Space Mono',monospace"}}>{fmt(pagAG)}</b>
              <span style={{margin:'0 8px'}}>·</span>
              Saldo: <b style={{color:saldoV>0?'var(--err)':'var(--ok)',fontFamily:"'Space Mono',monospace"}}>{fmt(saldoV)}</b>
            </div>
          </div>
          {ps.length>0 && ps.map(p=>(
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 6px', background:'var(--bg2)', borderRadius:6, marginBottom:3, fontSize:11 }}>
              <span style={{ fontSize:9, fontWeight:700, color:tipoColor[p.tipo]||'var(--muted)', minWidth:70 }}>{tipoLabel[p.tipo]||p.tipo}</span>
              <span style={{ color:'var(--muted)', fontSize:10 }}>{p.fecha}</span>
              {p.monto_dm>0 && <span>DM: <b style={{fontFamily:"'Space Mono',monospace",color:'var(--info)'}}>{fmt(p.monto_dm)}</b></span>}
              {p.monto_ag>0 && <span>AG: <b style={{fontFamily:"'Space Mono',monospace",color:'#A855F7'}}>{fmt(p.monto_ag)}</b></span>}
              {p.notas && <span style={{color:'var(--muted)',fontStyle:'italic',flex:1}}>{p.notas}</span>}
              <button className="btn btn-danger btn-xs" style={{marginLeft:'auto'}} onClick={()=>handleEliminarPago(p.id)}><i className="ti ti-trash"/></button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <button className="btn btn-out btn-sm" onClick={onBack}>
          <i className="ti ti-arrow-left"/>{agremiado.nombre}
        </button>
        <div>
          <div style={{ fontSize:16, fontWeight:700 }}>Informe interno — {agremiado.nombre}</div>
          <div style={{ fontSize:11, color:'var(--muted)' }}>
            JSV cobra: ${tarifaCobro}/m³/km · JSV paga: ${tarifaPago}/m³/km · Diferencia: ${(tarifaCobro-tarifaPago).toFixed(2)}/m³/km
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <input type="date" value={filtroFechaI} onChange={e=>setFiltroFechaI(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} />
        <span style={{fontSize:11,color:'var(--muted)'}}>→</span>
        <input type="date" value={filtroFechaF} onChange={e=>setFiltroFechaF(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} />
      </div>

      {/* ====== SECCIÓN: COBRADO AL SINDICATO ====== */}
      <SectionTitle color="var(--ok)" count={cobrados.length}>✓ Cobrado al sindicato</SectionTitle>

      {cobrados.length > 0 && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <button className="btn btn-out btn-xs" onClick={toggleAllCobrados}>
              {selecCobrados.size===cobrados.length ? 'Deseleccionar todos' : `Seleccionar todos (${cobrados.length})`}
            </button>
            {selecCobrados.size>0 && <span style={{ fontSize:11, color:'var(--muted)' }}>{selecCobrados.size} seleccionados</span>}
          </div>

          {cobrados.map(v => <ViajeCard key={v.id} v={v} showCheck={true} />)}

          {/* Resumen de liquidación de los seleccionados */}
          {selecCobrados.size>0 && (
            <div style={{ background:'var(--bg3)', border:'2px solid var(--acc)', borderRadius:12, padding:'14px 16px', marginTop:8, marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--acc)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.5px' }}>
                <i className="ti ti-calculator" style={{marginRight:6}}/>Liquidación — {selecCobrados.size} viaje{selecCobrados.size!==1?'s':''} seleccionado{selecCobrados.size!==1?'s':''}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                <div style={{ textAlign:'center', background:'var(--bg2)', borderRadius:8, padding:'10px' }}>
                  <div style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase', fontWeight:700 }}>M³ Total</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:'var(--info)' }}>{resumen.m3.toFixed(2)}</div>
                </div>
                <div style={{ textAlign:'center', background:'var(--bg2)', borderRadius:8, padding:'10px' }}>
                  <div style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase', fontWeight:700 }}>Utilidad JSV total</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:'#A855F7' }}>{fmt(resumen.util)}</div>
                </div>
                <div style={{ textAlign:'center', background:'var(--bg2)', borderRadius:8, padding:'10px' }}>
                  <div style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase', fontWeight:700 }}>50% c/u (base)</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:'#A855F7' }}>{fmt(resumen.util/2)}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {/* DM */}
                <div style={{ background:'rgba(29,78,216,.1)', border:'1px solid rgba(29,78,216,.3)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ background:'var(--info)', color:'#fff', borderRadius:4, padding:'2px 8px', fontSize:12, fontWeight:700 }}>DM</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>50% utilidad: <span style={{fontFamily:"'Space Mono',monospace",color:'var(--info)'}}>{fmt(resumen.util/2)}</span></div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>+ Inversión DM: <span style={{fontFamily:"'Space Mono',monospace",color:'var(--info)'}}>{fmt(resumen.invDM)}</span></div>
                  <div style={{ borderTop:'1px solid rgba(29,78,216,.3)', paddingTop:8 }}>
                    <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', fontWeight:700 }}>Total a DM</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:'var(--info)' }}>{fmt(totalDM)}</div>
                  </div>
                </div>
                {/* AG */}
                <div style={{ background:'rgba(168,85,247,.1)', border:'1px solid rgba(168,85,247,.3)', borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ background:'#A855F7', color:'#fff', borderRadius:4, padding:'2px 8px', fontSize:12, fontWeight:700 }}>AG</span>
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>50% utilidad: <span style={{fontFamily:"'Space Mono',monospace",color:'#A855F7'}}>{fmt(resumen.util/2)}</span></div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>+ Inversión AG: <span style={{fontFamily:"'Space Mono',monospace",color:'#A855F7'}}>{fmt(resumen.invAG)}</span></div>
                  <div style={{ borderTop:'1px solid rgba(168,85,247,.3)', paddingTop:8 }}>
                    <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', fontWeight:700 }}>Total a AG</div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:'#A855F7' }}>{fmt(totalAG)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {cobrados.length===0 && <div style={{ color:'var(--muted)', fontSize:12, padding:'8px 0 16px', fontStyle:'italic' }}>Sin viajes marcados como cobrados al sindicato</div>}

      {/* ====== SECCIÓN: PENDIENTE DE COBRAR ====== */}
      <SectionTitle color="var(--err)" count={pendientes.length}>⏳ Pendiente de cobrar al sindicato</SectionTitle>
      {pendientes.length ? pendientes.map(v => <ViajeCard key={v.id} v={v} showCheck={false} />) :
        <div style={{ color:'var(--muted)', fontSize:12, padding:'8px 0', fontStyle:'italic' }}>Sin viajes pendientes</div>
      }

      {/* Modal registrar pago */}
      {modalPago && (
        <div className="ov" onClick={e=>e.target.classList.contains('ov')&&setModalPago(null)}>
          <div className="modal" style={{width:420}}>
            <div className="mh">
              <div>
                <div style={{fontWeight:700}}>Registrar pago a {agremiado.nombre.split(' ')[0]}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>{modalPago.id} · Total: {fmt(calcPago(getM3(modalPago),modalPago.km||0))}</div>
              </div>
              <button className="mx" onClick={()=>setModalPago(null)}>×</button>
            </div>
            <div className="mb">
              <div className="row2">
                <div className="fg">
                  <label>Tipo</label>
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
              <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',marginTop:8}}>
                <div style={{fontSize:11,fontWeight:700,marginBottom:8,color:'var(--muted)'}}>¿Quién paga y cuánto?</div>
                <div className="row2">
                  <div className="fg">
                    <label style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{background:'var(--info)',color:'#fff',borderRadius:4,padding:'1px 6px',fontSize:10,fontWeight:700}}>DM</span>Monto DM
                    </label>
                    <input type="number" value={formMontoDM} onChange={e=>setFormMontoDM(e.target.value)} placeholder="0.00" step="0.01" min="0"/>
                  </div>
                  <div className="fg">
                    <label style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{background:'#A855F7',color:'#fff',borderRadius:4,padding:'1px 6px',fontSize:10,fontWeight:700}}>AG</span>Monto AG
                    </label>
                    <input type="number" value={formMontoAG} onChange={e=>setFormMontoAG(e.target.value)} placeholder="0.00" step="0.01" min="0"/>
                  </div>
                </div>
                {((parseFloat(formMontoDM)||0)+(parseFloat(formMontoAG)||0))>0 && (
                  <div style={{fontSize:11,marginTop:6,color:'var(--muted)'}}>
                    Total: <b style={{fontFamily:"'Space Mono',monospace",color:'var(--ok)'}}>{fmt((parseFloat(formMontoDM)||0)+(parseFloat(formMontoAG)||0))}</b>
                    <button type="button" style={{marginLeft:12,fontSize:10,background:'none',border:'none',color:'var(--info)',cursor:'pointer',textDecoration:'underline'}}
                      onClick={()=>{const m=(calcPago(getM3(modalPago),modalPago.km||0)/2).toFixed(2);setFormMontoDM(m);setFormMontoAG(m)}}>
                      Dividir 50/50
                    </button>
                  </div>
                )}
              </div>
              <div className="fg" style={{marginTop:8}}>
                <label>Notas <span style={{fontWeight:400,fontSize:9,color:'var(--muted)'}}>(opcional)</span></label>
                <input value={formNotas} onChange={e=>setFormNotas(e.target.value)} placeholder="Ej: Adelanto por descompostura..." />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-out" onClick={()=>setModalPago(null)}>Cancelar</button>
              <button className="btn btn-ok" onClick={handleGuardarPago} disabled={saving}>
                <i className="ti ti-device-floppy"/>{saving?'Guardando...':'Guardar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detalleViaje && <ModalDetalleViaje viaje={detalleViaje} onClose={()=>setDetalleViaje(null)} onReabrir={id=>{reabrirViaje(id);setDetalleViaje(null)}}/>}
    </div>
  )
}
