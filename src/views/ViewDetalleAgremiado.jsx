import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalDetalleViaje from '../components/ModalDetalleViaje'

export default function ViewDetalleAgremiado({ agremiado, onBack }) {
  const { viajes, estimaciones, pagos, vCobro, vPago, vM3, fmt, perm, reabrirViaje, config } = useApp()
  const [detalleViaje, setDetalleViaje] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroFechaI, setFiltroFechaI] = useState('')
  const [filtroFechaF, setFiltroFechaF] = useState('')
  const p = perm()

  const vs = viajes.filter(v => v.agremiado_id === agremiado.id)
  const filtered = vs.filter(v => {
    if (filtroEstado && v.estado !== filtroEstado) return false
    if (filtroFechaI && v.fecha_salida < filtroFechaI) return false
    if (filtroFechaF && v.fecha_salida > filtroFechaF) return false
    return true
  }).sort((a,b) => (b.fecha_salida||'').localeCompare(a.fecha_salida||''))

  const totalM3  = filtered.reduce((a,v) => a + vM3(v), 0)
  const totalCob = filtered.reduce((a,v) => a + vCobro(v), 0)
  const totalPag = filtered.reduce((a,v) => a + vPago(v), 0)
  const pagados  = filtered.filter(v => v.pagado === true).length
  const sinPagar = filtered.filter(v => !v.pagado).length

  function exportarExcel() {
    const headers = ['Folio','Gondola','M³','Tipo','Tracto','KM','Fecha Salida','Fecha Llegada','Estado','Estimacion','Pago']
    const data = []
    filtered.forEach(v => {
      const base = [v.tipo, v.tracto, v.km||0, v.fecha_salida||'', v.fecha_llegada||'', v.estado, v.estimacion_id||'']
      if (v.tipo === 'full') {
        const pagoG1 = +(config.tarifa_pago * (v.m3_1||0) * (v.km||0)).toFixed(2)
        const pagoG2 = +(config.tarifa_pago * (v.m3_2||0) * (v.km||0)).toFixed(2)
        data.push([v.id, v.gondola1||'', v.m3_1||0, ...base, pagoG1])
        data.push([v.folio2||'', v.gondola2||'', v.m3_2||0, ...base, pagoG2])
      } else {
        data.push([v.id, v.gondola1||'', v.m3_1||0, ...base, vPago(v)])
      }
    })
    const csv = [headers, ...data].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url; a.download=`viajes-${agremiado.nombre.replace(/\s+/g,'-')}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const getEst = id => estimaciones.find(e => e.id === id)

  return (
    <div>
      {/* Header con botón back */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button className="btn btn-out btn-sm" onClick={onBack}>
          <i className="ti ti-arrow-left" />Agremiados
        </button>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>{agremiado.nombre}</div>
          <div style={{ fontSize:11, color:'var(--muted)', display:'flex', gap:12, marginTop:2 }}>
            {agremiado.telefono && <span><i className="ti ti-phone" style={{fontSize:10}} /> {agremiado.telefono}</span>}
            {agremiado.email && <span><i className="ti ti-mail" style={{fontSize:10}} /> {agremiado.email}</span>}
            <span>{vs.length} viajes registrados</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis kpis-4" style={{ marginBottom:14 }}>
        <div className="kpi"><div className="kpi-l">Viajes</div><div className="kpi-v" style={{color:'var(--acc)'}}>{filtered.length}</div></div>
        <div className="kpi"><div className="kpi-l">M³ Total</div><div className="kpi-v" style={{color:'var(--info)'}}>{totalM3.toFixed(2)}</div></div>
        <div className="kpi"><div className="kpi-l">Pagados</div><div className="kpi-v" style={{color:'var(--ok)'}}>{pagados}</div></div>
        <div className="kpi"><div className="kpi-l">Sin pagar</div><div className="kpi-v" style={{color:'var(--err)'}}>{sinPagar}</div></div>
        {p.canVerPrecios && <>
          <div className="kpi"><div className="kpi-l">Cobro total</div><div className="kpi-v" style={{color:'var(--cobro)',fontSize:14}}>{fmt(totalCob)}</div></div>
          <div className="kpi"><div className="kpi-l">Pago total</div><div className="kpi-v" style={{color:'var(--pago)',fontSize:14}}>{fmt(totalPag)}</div></div>
        </>}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 8px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }}>
          <option value="">Todos los estados</option>
          <option value="abierto">Abierto</option>
          <option value="pendiente_conciliar">Pend. conciliar</option>
          <option value="en_conciliacion">En conciliación</option>
          <option value="pendiente_pago">Pend. pago</option>
          <option value="cerrado">Cerrado</option>
        </select>
        <input type="date" value={filtroFechaI} onChange={e=>setFiltroFechaI(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} title="Desde" />
        <span style={{fontSize:11,color:'var(--muted)'}}>→</span>
        <input type="date" value={filtroFechaF} onChange={e=>setFiltroFechaF(e.target.value)}
          style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} title="Hasta" />
        <div style={{flex:1}} />
        <button className="btn btn-out btn-sm" onClick={exportarExcel}><i className="ti ti-table-export"/>Excel</button>
      </div>

      {/* Lista de viajes con fotos */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.length ? filtered.map(v => {
          const est = getEst(v.estimacion_id)
          const pagosV = pagos.filter(p => p.viaje_id === v.id)
          const totalPagado = pagosV.reduce((a,p)=>a+(p.monto||0),0)
          return (
            <div key={v.id} onClick={() => setDetalleViaje(v)}
              style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', cursor:'pointer', transition:'border .15s' }}
              onMouseOver={e=>e.currentTarget.style.borderColor='var(--acc)'}
              onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>

              {/* Encabezado del viaje */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <span style={{ fontFamily:"'Space Mono',monospace", fontSize:13, fontWeight:700, color:'var(--acc)' }}>{v.id}</span>
                  {v.folio2 && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:'var(--muted)', marginLeft:8 }}>/ {v.folio2}</span>}
                  <div style={{ display:'flex', gap:6, marginTop:4 }}>
                    <Pill s={v.tipo} />
                    <Pill s={v.estado} />
                    {v.pagado ? <span className="pill pg" style={{fontSize:9}}>✓ Pagado</span> : <span className="pill pr" style={{fontSize:9}}>Sin pagar</span>}
                  </div>
                </div>
                <div style={{ textAlign:'right', fontSize:11 }}>
                  <div style={{ color:'var(--muted)' }}>{v.fecha_salida||'—'} {v.hora_salida||''}</div>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontWeight:700, color:'var(--info)' }}>{vM3(v)} m³</div>
                  {p.canVerPrecios && <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--pago)' }}>{fmt(vPago(v))}</div>}
                </div>
              </div>

              {/* Datos */}
              <div style={{ display:'flex', gap:16, fontSize:11, color:'var(--muted)', marginBottom:10, flexWrap:'wrap' }}>
                <span><b style={{color:'var(--text)'}}>Tracto:</b> {v.tracto}</span>
                <span><b style={{color:'var(--text)'}}>Operador:</b> {v.operador||'—'}</span>
                <span><b style={{color:'var(--text)'}}>Ruta:</b> {v.origen||'—'} → {v.destino||'—'} ({v.km} km)</span>
                {est && <span><b style={{color:'var(--text)'}}>Est:</b> <span style={{color:'var(--acc)'}}>{est.id}</span></span>}
                {totalPagado > 0 && p.canVerPrecios && <span><b style={{color:'var(--text)'}}>Pagado:</b> <span style={{color:'var(--ok)'}}>{fmt(totalPagado)}</span></span>}
              </div>

              {/* Fotos */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[
                  { label:'T.Salida', url:v.foto_ticket_salida_url, ok:v.foto_ticket_salida },
                  ...(v.tipo==='full' ? [{ label:'T.Salida 2', url:v.foto_ticket2_url, ok:!!v.foto_ticket2_url }] : []),
                  { label:'Tracto', url:v.foto_tracto_url, ok:v.foto_tracto },
                  { label:'T.Llegada', url:v.foto_ticket_llegada_url, ok:v.foto_ticket_llegada },
                  ...(v.tipo==='full' ? [{ label:'T.Llegada 2', url:v.foto_ticket_llegada2_url, ok:!!v.foto_ticket_llegada2_url }] : []),
                ].map(f => (
                  <div key={f.label} onClick={e => { e.stopPropagation(); f.url && window.open(f.url,'_blank') }}
                    style={{ position:'relative', cursor: f.url?'pointer':'default' }}>
                    {f.url
                      ? <img src={f.url} style={{ width:56, height:56, objectFit:'cover', borderRadius:6, border:'1px solid var(--border)' }} />
                      : <div style={{ width:56, height:56, borderRadius:6, border:'1px dashed var(--border2)', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <i className="ti ti-photo-off" style={{fontSize:18,color:'var(--muted)'}} />
                        </div>
                    }
                    <div style={{ fontSize:8, textAlign:'center', color:f.ok?'var(--ok)':'var(--muted)', marginTop:2 }}>{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        }) : (
          <div style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>Sin viajes con ese filtro</div>
        )}
      </div>

      {detalleViaje && <ModalDetalleViaje viaje={detalleViaje} onClose={() => setDetalleViaje(null)} onReabrir={id => { reabrirViaje(id); setDetalleViaje(null) }} />}
    </div>
  )
}
