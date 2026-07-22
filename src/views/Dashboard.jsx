import { useState, useMemo } from 'react'
import ModalDetalleViaje from '../components/ModalDetalleViaje'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import ModalLlegada from '../components/ModalLlegada'
import ModalConciliacion from '../components/ModalConciliacion'

// Semana lunes-domingo: devuelve {inicio, fin} de la semana que contiene 'fecha'
function semanaDeDate(d) {
  const date = new Date(d + 'T12:00:00')
  const day = date.getDay() // 0=dom, 1=lun...
  const diffLunes = (day === 0 ? -6 : 1 - day)
  const lunes = new Date(date); lunes.setDate(date.getDate() + diffLunes)
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6)
  const fmt = d => d.toISOString().slice(0,10)
  return { inicio: fmt(lunes), fin: fmt(domingo) }
}

function semanaActual() {
  return semanaDeDate(new Date().toISOString().slice(0,10))
}

function tiempoEntregaHoras(v) {
  if (!v.fecha_salida || !v.fecha_llegada) return null
  const sal = new Date(`${v.fecha_salida}T${v.hora_salida||'00:00'}:00`)
  const lle = new Date(`${v.fecha_llegada}T${v.hora_llegada||'00:00'}:00`)
  const diff = (lle - sal) / 3600000 // horas
  return diff > 0 ? diff : null
}

export default function Dashboard({ onNewTicket, searchQ = '' }) {
  const { viajes, estimaciones, agremiados, vCobro, vPago, vM3, fmt, mandarAPago, reabrirViaje, perm } = useApp()
  const [tab, setTab]           = useState('pendientes')
  const [detalleV, setDetalleV] = useState(null)
  const [llegadaV, setLlegadaV] = useState(null)
  const [showConcil, setShowConcil] = useState(false)

  // Filtros Pendientes
  const [fAgr, setFAgr]   = useState('')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')
  const [sortCol, setSortCol] = useState('fecha_salida')
  const [sortDir, setSortDir] = useState('asc')

  // Filtros Histórico/General
  const [hAgr, setHAgr]     = useState('')
  const [hDesde, setHDesde] = useState('')
  const [hHasta, setHHasta] = useState('')
  const [hSortCol, setHSortCol] = useState('fecha_salida')
  const [hSortDir, setHSortDir] = useState('desc')

  const p = perm() || {}
  const getNombre = id => agremiados?.find(a=>a.id===id)?.nombre || '—'
  const today = new Date().toISOString().slice(0,10)
  const semana = semanaActual()

  function toggleSort(col, isHist=false) {
    if (isHist) {
      if (hSortCol===col) setHSortDir(d=>d==='asc'?'desc':'asc')
      else { setHSortCol(col); setHSortDir('asc') }
    } else {
      if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc')
      else { setSortCol(col); setSortDir('asc') }
    }
  }

  const SortIcon = ({ col, isHist=false }) => {
    const sc = isHist ? hSortCol : sortCol
    const sd = isHist ? hSortDir : sortDir
    return sc===col
      ? <i className={`ti ti-arrow-${sd==='asc'?'up':'down'}`} style={{fontSize:10,marginLeft:3}}/>
      : <i className="ti ti-arrows-sort" style={{fontSize:10,marginLeft:3,opacity:.3}}/>
  }

  function sortViajes(arr, col, dir) {
    return [...arr].sort((a,b) => {
      let va = a[col]||'', vb = b[col]||''
      if (col==='m3') { va=vM3(a); vb=vM3(b) }
      if (col==='cobro') { va=vCobro(a); vb=vCobro(b) }
      if (typeof va==='number') return dir==='asc'?va-vb:vb-va
      return dir==='asc'?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va))
    })
  }

  // ── PENDIENTES DE CONCILIAR ──
  const pendientesBase = viajes.filter(v => {
    if (!['abierto','pendiente_conciliar'].includes(v.estado)) return false
    if (fAgr && v.agremiado_id !== fAgr) return false
    if (fDesde && (v.fecha_salida||'') < fDesde) return false
    if (fHasta && (v.fecha_salida||'') > fHasta) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      if (!`${v.id} ${v.tracto} ${v.operador||''} ${getNombre(v.agremiado_id)}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  const pendientes = sortViajes(pendientesBase, sortCol, sortDir)

  // Identificar críticos: salieron hace más de 7 días y no conciliados
  const diasSinConciliar = v => {
    if (!v.fecha_salida) return 0
    return Math.floor((new Date(today) - new Date(v.fecha_salida)) / 86400000)
  }
  const esCritico = v => diasSinConciliar(v) > 7

  // Contar por semanas previas (para badge)
  const semanaAnterior = (() => {
    const l = new Date(semana.inicio + 'T12:00:00'); l.setDate(l.getDate()-7)
    return semanaDeDate(l.toISOString().slice(0,10))
  })()
  const criticos = pendientesBase.filter(esCritico)
  const pendSemanaActual = pendientesBase.filter(v => v.fecha_salida >= semana.inicio && v.fecha_salida <= semana.fin)
  const pendSemanaAnterior = pendientesBase.filter(v => v.fecha_salida >= semanaAnterior.inicio && v.fecha_salida <= semanaAnterior.fin)

  // ── HISTÓRICO (solo conciliados/cerrados) ──
  const historicosBase = viajes.filter(v => {
    if (!['en_conciliacion','pendiente_pago','cerrado'].includes(v.estado)) return false
    if (hAgr && v.agremiado_id !== hAgr) return false
    if (hDesde && (v.fecha_salida||'') < hDesde) return false
    if (hHasta && (v.fecha_salida||'') > hHasta) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      if (!`${v.id} ${v.tracto} ${v.operador||''} ${getNombre(v.agremiado_id)}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  const historicos = sortViajes(historicosBase, hSortCol, hSortDir)

  // ── GENERAL (todos) ──
  const generalesBase = viajes.filter(v => {
    if (hAgr && v.agremiado_id !== hAgr) return false
    if (hDesde && (v.fecha_salida||'') < hDesde) return false
    if (hHasta && (v.fecha_salida||'') > hHasta) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      if (!`${v.id} ${v.tracto} ${v.operador||''} ${getNombre(v.agremiado_id)}`.toLowerCase().includes(q)) return false
    }
    return true
  })
  const generales = sortViajes(generalesBase, hSortCol, hSortDir)

  // KPIs generales
  const totalCob  = generalesBase.reduce((a,v)=>a+vCobro(v),0)
  const totalPag  = generalesBase.reduce((a,v)=>a+vPago(v),0)
  const totalUtil = totalCob - totalPag
  const totalM3   = generalesBase.reduce((a,v)=>a+vM3(v),0)
  const hoy = generalesBase.filter(v=>v.fecha_salida===today)
  const entregasHoy = generalesBase.filter(v=>v.fecha_llegada===today)
  const tiemposValidos = generalesBase.map(tiempoEntregaHoras).filter(t=>t!==null&&t<200)
  const tiempoPromedio = tiemposValidos.length ? tiemposValidos.reduce((a,b)=>a+b,0)/tiemposValidos.length : 0

  // Excel pendientes
  function exportarPendientes() {
    const headers = ['Folio','Tracto','Tipo','Agremiado','Operador','M³','Fecha Sal.','Días sin conciliar','Estado','Crítico']
    const data = pendientes.map(v => [
      v.id, v.tracto, v.tipo, getNombre(v.agremiado_id), v.operador||'—',
      vM3(v), v.fecha_salida||'', diasSinConciliar(v), v.estado, esCritico(v)?'SÍ':'NO'
    ])
    const csv = [headers,...data].map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`pendientes-${today}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const ThSort = ({ col, children, isHist=false }) => (
    <th onClick={()=>toggleSort(col,isHist)} style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
      {children}<SortIcon col={col} isHist={isHist}/>
    </th>
  )

  const TablaViajes = ({ lista, showCobro=false, isHist=false }) => (
    <div className="tw">
      <table>
        <thead><tr>
          <ThSort col="id" isHist={isHist}>TICKET</ThSort>
          <ThSort col="tracto" isHist={isHist}>TRACTO</ThSort>
          <th>TIPO</th>
          <ThSort col="agremiado_id" isHist={isHist}>AGREMIADO</ThSort>
          <ThSort col="m3" isHist={isHist}>M³</ThSort>
          <ThSort col="fecha_salida" isHist={isHist}>FECHA SAL.</ThSort>
          <ThSort col="fecha_llegada" isHist={isHist}>LLEGADA</ThSort>
          <th>TIEMPO</th>
          {showCobro && p.canVerPrecios && <ThSort col="cobro" isHist={isHist}>COBRO</ThSort>}
          <ThSort col="estado" isHist={isHist}>ESTADO</ThSort>
        </tr></thead>
        <tbody>
          {lista.length ? lista.map(v => {
            const horas = tiempoEntregaHoras(v)
            const critico = esCritico(v)
            return (
              <tr key={v.id} className="tr" onClick={()=>setDetalleV(v)}
                style={{background: critico&&tab==='pendientes'?'rgba(239,68,68,.05)':''}}>
                <td>
                  <span className="mono" style={{color:critico&&tab==='pendientes'?'var(--err)':'var(--acc)',fontWeight:700}}>{v.id}</span>
                  {v.folio2&&<div className="mono" style={{fontSize:9,color:'var(--muted)'}}>{v.folio2}</div>}
                  {critico&&tab==='pendientes'&&<div style={{fontSize:9,color:'var(--err)',fontWeight:700}}>⚠ {diasSinConciliar(v)}d</div>}
                </td>
                <td className="mono">{v.tracto}</td>
                <td><Pill s={v.tipo}/></td>
                <td style={{fontSize:10}}>{getNombre(v.agremiado_id)}</td>
                <td className="mono">{vM3(v)}</td>
                <td style={{fontSize:11}}>{v.fecha_salida||'—'}</td>
                <td style={{fontSize:11,color:v.fecha_llegada?'var(--ok)':'var(--muted)'}}>{v.fecha_llegada||'—'}</td>
                <td style={{fontSize:10,color:'var(--muted)',fontFamily:"'Space Mono',monospace"}}>
                  {horas ? (horas<24?`${horas.toFixed(1)}h`:`${(horas/24).toFixed(1)}d`) : '—'}
                </td>
                {showCobro && p.canVerPrecios && <td className="mono" style={{color:'var(--cobro)'}}>{fmt(vCobro(v))}</td>}
                <td><Pill s={v.estado}/></td>
              </tr>
            )
          }) : (
            <tr><td colSpan={10} style={{textAlign:'center',padding:20,color:'var(--muted)'}}>Sin resultados</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )

  const FiltroBar = ({ agr, setAgr, desde, setDesde, hasta, setHasta, onExcel, showExcel=false }) => (
    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
      <select value={agr} onChange={e=>setAgr(e.target.value)}
        style={{height:28,fontSize:11,padding:'0 8px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)'}}>
        <option value="">Todos los agremiados</option>
        {agremiados?.filter(a=>a.activo!==false).map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
      </select>
      <input type="date" value={desde} onChange={e=>setDesde(e.target.value)}
        style={{height:28,fontSize:11,padding:'0 7px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)'}} title="Desde" />
      <span style={{fontSize:11,color:'var(--muted)'}}>→</span>
      <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)}
        style={{height:28,fontSize:11,padding:'0 7px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)'}} title="Hasta" />
      {(agr||desde||hasta) && (
        <button className="btn btn-out btn-xs" onClick={()=>{setAgr('');setDesde('');setHasta('')}}>
          <i className="ti ti-x"/>Limpiar
        </button>
      )}
      <div style={{flex:1}}/>
      {showExcel && <button className="btn btn-out btn-sm" onClick={onExcel}><i className="ti ti-table-export"/>Excel</button>}
    </div>
  )

  return (
    <div>
      <div className="dtabs">
        <button className={`dtab${tab==='pendientes'?' active':''}`} onClick={()=>setTab('pendientes')}>
          ⏳ Pendientes de conciliar
          {pendientesBase.length>0 && <span style={{background:'rgba(0,0,0,.2)',borderRadius:10,padding:'1px 6px',marginLeft:4,fontSize:10}}>{pendientesBase.length}</span>}
          {criticos.length>0 && <span style={{background:'rgba(239,68,68,.7)',borderRadius:10,padding:'1px 6px',marginLeft:4,fontSize:10}}>⚠ {criticos.length}</span>}
        </button>
        <button className={`dtab${tab==='historico'?' active':''}`} onClick={()=>setTab('historico')}>
          📋 Histórico
          <span style={{background:'rgba(0,0,0,.2)',borderRadius:10,padding:'1px 6px',marginLeft:4,fontSize:10}}>{historicosBase.length}</span>
        </button>
        <button className={`dtab${tab==='general'?' active':''}`} onClick={()=>setTab('general')}>
          📊 General
        </button>
      </div>

      {/* ── PENDIENTES ── */}
      {tab==='pendientes' && (
        <div>
          {/* KPIs */}
          <div className="kpis kpis-4" style={{marginBottom:12}}>
            <div className="kpi acc">
              <div className="kpi-l">Total pendientes</div>
              <div className="kpi-v">{pendientesBase.length}</div>
            </div>
            <div className="kpi red">
              <div className="kpi-l">⚠ Críticos (+7 días)</div>
              <div className="kpi-v">{criticos.length}</div>
            </div>
            <div className="kpi" style={{border:'1px solid var(--border)'}}>
              <div className="kpi-l">Esta semana ({semana.inicio})</div>
              <div className="kpi-v" style={{color:'var(--info)'}}>{pendSemanaActual.length}</div>
            </div>
            <div className="kpi" style={{border:'1px solid var(--border)'}}>
              <div className="kpi-l">Semana anterior</div>
              <div className="kpi-v" style={{color:'var(--warn)'}}>{pendSemanaAnterior.length}</div>
            </div>
          </div>

          {/* Filtros rápidos de semana */}
          <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
            <button className={`btn btn-xs ${!fDesde&&!fHasta?'btn-acc':'btn-out'}`} onClick={()=>{setFDesde('');setFHasta('')}}>Todos</button>
            <button className={`btn btn-xs ${fDesde===semana.inicio&&fHasta===semana.fin?'btn-acc':'btn-out'}`}
              onClick={()=>{setFDesde(semana.inicio);setFHasta(semana.fin)}}>Esta semana</button>
            <button className={`btn btn-xs ${fDesde===semanaAnterior.inicio&&fHasta===semanaAnterior.fin?'btn-acc':'btn-out'}`}
              onClick={()=>{setFDesde(semanaAnterior.inicio);setFHasta(semanaAnterior.fin)}}>Semana anterior</button>
            <button className={`btn btn-xs ${fDesde===today&&fHasta===today?'btn-acc':'btn-out'}`}
              onClick={()=>{setFDesde(today);setFHasta(today)}}>Hoy</button>
            {criticos.length>0 && (
              <button className="btn btn-xs btn-danger" onClick={()=>{setFDesde('');setFHasta('');setFAgr('')}}>
                ⚠ Ver críticos ({criticos.length})
              </button>
            )}
          </div>

          <FiltroBar agr={fAgr} setAgr={setFAgr} desde={fDesde} setDesde={setFDesde}
            hasta={fHasta} setHasta={setFHasta} onExcel={exportarPendientes} showExcel={true} />

          {p.canConciliar && pendientesBase.length>0 && (
            <div style={{marginBottom:10}}>
              <button className="btn btn-acc btn-sm" onClick={()=>setShowConcil(true)}>
                <i className="ti ti-file-check"/>Conciliar seleccionados
              </button>
            </div>
          )}

          <div className="tc">
            <div className="tc-h">
              <span className="tc-t">
                {pendientes.length} viaje{pendientes.length!==1?'s':''} pendiente{pendientes.length!==1?'s':''}
                {criticos.filter(v=>{
                  if(fAgr&&v.agremiado_id!==fAgr) return false
                  if(fDesde&&v.fecha_salida<fDesde) return false
                  if(fHasta&&v.fecha_salida>fHasta) return false
                  return true
                }).length>0 && <span style={{color:'var(--err)',marginLeft:8,fontSize:11}}>⚠ incluye críticos</span>}
              </span>
            </div>
            <TablaViajes lista={pendientes} showCobro={true} />
          </div>
        </div>
      )}

      {/* ── HISTÓRICO ── */}
      {tab==='historico' && (
        <div>
          <div className="kpis kpis-4" style={{marginBottom:12}}>
            <div className="kpi acc"><div className="kpi-l">Viajes conciliados</div><div className="kpi-v">{historicosBase.length}</div></div>
            {p.canVerPrecios && <>
              <div className="kpi grn"><div className="kpi-l">Cobro total</div><div className="kpi-v" style={{fontSize:14}}>{fmt(historicosBase.reduce((a,v)=>a+vCobro(v),0))}</div></div>
              <div className="kpi red"><div className="kpi-l">Pago total</div><div className="kpi-v" style={{fontSize:14}}>{fmt(historicosBase.reduce((a,v)=>a+vPago(v),0))}</div></div>
              <div className="kpi pur"><div className="kpi-l">Utilidad CATEM</div><div className="kpi-v" style={{fontSize:14}}>{fmt(historicosBase.reduce((a,v)=>a+vCobro(v)-vPago(v),0))}</div></div>
            </>}
          </div>
          <FiltroBar agr={hAgr} setAgr={setHAgr} desde={hDesde} setDesde={setHDesde} hasta={hHasta} setHasta={setHHasta} />
          <div className="tc">
            <div className="tc-h"><span className="tc-t">{historicos.length} viajes conciliados</span></div>
            <TablaViajes lista={historicos} showCobro={true} isHist={true} />
          </div>
        </div>
      )}

      {/* ── GENERAL ── */}
      {tab==='general' && (
        <div>
          <div className="kpis kpis-4" style={{marginBottom:12}}>
            <div className="kpi acc"><div className="kpi-l">Total viajes</div><div className="kpi-v">{generalesBase.length}</div></div>
            <div className="kpi"><div className="kpi-l">Salidas hoy</div><div className="kpi-v" style={{color:'var(--info)'}}>{hoy.length}</div></div>
            <div className="kpi"><div className="kpi-l">Entregas hoy</div><div className="kpi-v" style={{color:'var(--ok)'}}>{entregasHoy.length}</div></div>
            <div className="kpi"><div className="kpi-l">M³ total</div><div className="kpi-v" style={{color:'var(--info)',fontSize:14}}>{totalM3.toFixed(1)}</div></div>
            {p.canVerPrecios && <>
              <div className="kpi grn"><div className="kpi-l">Cobro total</div><div className="kpi-v" style={{fontSize:13}}>{fmt(totalCob)}</div></div>
              <div className="kpi red"><div className="kpi-l">Pago total</div><div className="kpi-v" style={{fontSize:13}}>{fmt(totalPag)}</div></div>
              <div className="kpi pur"><div className="kpi-l">Utilidad CATEM</div><div className="kpi-v" style={{fontSize:13}}>{fmt(totalUtil)}</div></div>
            </>}
            <div className="kpi"><div className="kpi-l">Tiempo prom. entrega</div><div className="kpi-v" style={{color:'var(--muted)',fontSize:14}}>{tiempoPromedio>0?(tiempoPromedio<24?`${tiempoPromedio.toFixed(1)}h`:`${(tiempoPromedio/24).toFixed(1)}d`):'—'}</div></div>
          </div>
          <FiltroBar agr={hAgr} setAgr={setHAgr} desde={hDesde} setDesde={setHDesde} hasta={hHasta} setHasta={setHHasta} />
          <div className="tc">
            <div className="tc-h"><span className="tc-t">{generales.length} viajes</span></div>
            <TablaViajes lista={generales} showCobro={true} isHist={true} />
          </div>
        </div>
      )}

      {detalleV && <ModalDetalleViaje viaje={detalleV} onClose={()=>setDetalleV(null)} onReabrir={id=>{reabrirViaje(id);setDetalleV(null)}}/>}
      {llegadaV && <ModalLlegada viaje={llegadaV} onClose={()=>setLlegadaV(null)} onSaved={()=>setLlegadaV(null)}/>}
      {showConcil && <ModalConciliacion viajes={pendientesBase} onClose={()=>setShowConcil(false)}/>}
    </div>
  )
}
