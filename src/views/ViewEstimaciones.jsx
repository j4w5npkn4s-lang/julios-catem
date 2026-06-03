import { useState } from 'react'
import ModalDetalleViaje from '../components/ModalDetalleViaje'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import Pill from '../components/Pill'
import FotoSlot from '../components/FotoSlot'

// ── PANTALLA 1: AÑOS ──────────────────────────────────────────────
function PantallaAnios({ onSelectAnio }) {
  const { estimaciones, addEstimacion, perm } = useApp()
  const toast = useToast()
  const p = perm()

  const aniosExistentes = [...new Set(estimaciones.map(e => e.year))].sort((a,b) => b-a)
  const anioActual = new Date().getFullYear()
  if (!aniosExistentes.includes(anioActual)) aniosExistentes.unshift(anioActual)

  async function handleNuevoAnio() {
    const anio = prompt('¿Qué año quieres agregar?', String(anioActual + 1))
    if (!anio || isNaN(parseInt(anio))) return
    toast(`Año ${anio} disponible`, 'ok')
    onSelectAnio(parseInt(anio))
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Selecciona un año</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Cada año contiene sus estimaciones/conciliaciones</div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {aniosExistentes.map(y => {
          const ests = estimaciones.filter(e => e.year === y)
          const abiertas = ests.filter(e => e.estado === 'abierta').length
          const cerradas = ests.filter(e => e.estado === 'cerrada').length
          return (
            <div key={y}
              onClick={() => onSelectAnio(y)}
              style={{ background: 'var(--bg2)', border: y === anioActual ? '2px solid var(--acc)' : '1px solid var(--border)', borderRadius: 14, padding: '20px 28px', cursor: 'pointer', transition: 'all .18s', minWidth: 160, textAlign: 'center' }}
              onMouseOver={e => e.currentTarget.style.borderColor='var(--acc)'}
              onMouseOut={e => e.currentTarget.style.borderColor = y === anioActual ? 'var(--acc)' : 'var(--border)'}
            >
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 32, fontWeight: 700, color: 'var(--acc)', lineHeight: 1 }}>{y}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{ests.length} estimación(es)</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                {abiertas > 0 && <span className="pill pa">{abiertas} abiertas</span>}
                {cerradas > 0 && <span className="pill pg">{cerradas} cerradas</span>}
                {ests.length === 0 && <span className="pill pgr">Sin estimaciones</span>}
              </div>
            </div>
          )
        })}
        {p.canTodo && (
          <div onClick={handleNuevoAnio}
            style={{ background: 'transparent', border: '2px dashed var(--border2)', borderRadius: 14, padding: '20px 28px', cursor: 'pointer', minWidth: 160, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .18s' }}
            onMouseOver={e => e.currentTarget.style.borderColor='var(--acc)'}
            onMouseOut={e => e.currentTarget.style.borderColor='var(--border2)'}
          >
            <i className="ti ti-plus" style={{ fontSize: 28, color: 'var(--muted)' }} />
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nuevo año</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── PANTALLA 2: ESTIMACIONES DEL AÑO ─────────────────────────────
function PantallaEstimaciones({ anio, onBack, onSelectEst }) {
  const { estimaciones, viajes, addEstimacion, vCobro, vPago, vM3, fmt, perm } = useApp()
  const toast = useToast()
  const p = perm()
  const [showNew, setShowNew] = useState(false)
  const [nombre, setNombre]   = useState('')
  const [fechaI, setFechaI]   = useState('')
  const [fechaF, setFechaF]   = useState('')
  const [saving, setSaving]   = useState(false)

  const ests = estimaciones.filter(e => e.year === anio).sort((a,b) => new Date(b.created_at) - new Date(a.created_at))

  async function handleCrear() {
    if (!nombre.trim()) return toast('El nombre es requerido', 'err')
    setSaving(true)
    try {
      const id = `EST-${anio}-${String(Date.now()).slice(-4)}`
      await addEstimacion({ id, year: anio, descripcion: nombre.trim(), cliente: '', estado: 'abierta',
        fecha_inicio: fechaI || null, fecha_fin: fechaF || null })
      toast(`Estimación ${id} creada ✓`, 'ok')
      setShowNew(false); setNombre(''); setFechaI(''); setFechaF('')
    } catch (err) { toast(err.message, 'err') }
    setSaving(false)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-out btn-sm" onClick={onBack}><i className="ti ti-arrow-left" />Años</button>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: 'var(--acc)' }}>{anio}</div>
        <div style={{ flex: 1 }} />
        {p.canConciliar && (
          <button className="btn btn-acc btn-sm" onClick={() => setShowNew(true)}>
            <i className="ti ti-plus" />Nueva estimación
          </button>
        )}
      </div>

      {/* Lista */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
        {ests.map(e => {
          const vs = viajes.filter(v => v.estimacion_id === e.id)
          const m3  = vs.reduce((a,v) => a + vM3(v), 0)
          const cob = vs.reduce((a,v) => a + vCobro(v), 0)
          const pag = vs.reduce((a,v) => a + vPago(v), 0)
          return (
            <div key={e.id} onClick={() => onSelectEst(e)}
              style={{ background: 'var(--bg2)', border: `1px solid ${e.estado==='cerrada'?'rgba(34,197,94,.3)':'rgba(245,158,11,.3)'}`, borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all .18s' }}
              onMouseOver={ev => ev.currentTarget.style.transform='translateY(-2px)'}
              onMouseOut={ev  => ev.currentTarget.style.transform='none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: 'var(--acc)' }}>{e.id}</div>
                <Pill s={e.estado} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{e.descripcion}</div>
              {(e.fecha_inicio || e.fecha_fin) && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
                  {e.fecha_inicio || '?'} → {e.fecha_fin || '?'}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div><div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Viajes</div><div style={{ fontSize: 18, fontWeight: 700 }}>{vs.length}</div></div>
                <div><div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>M³</div><div style={{ fontSize: 18, fontWeight: 700 }}>{m3.toFixed(0)}</div></div>
                <div><div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Cobro</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--cobro)' }}>{fmt(cob)}</div></div>
              </div>
            </div>
          )
        })}
        {!ests.length && (
          <div className="empty" style={{ gridColumn:'1/-1' }}>
            <i className="ti ti-file-invoice" /><p>Sin estimaciones para {anio}</p>
          </div>
        )}
      </div>

      {/* Modal nueva estimación */}
      {showNew && (
        <Modal title="Nueva estimación" onClose={() => setShowNew(false)}
          footer={<><button className="btn btn-out" onClick={() => setShowNew(false)}>Cancelar</button><button className="btn btn-acc" onClick={handleCrear} disabled={saving}>{saving?'Creando...':'Crear estimación'}</button></>}>
          <div className="fg"><label>Nombre / Descripción</label><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Estimación Mayo 2026" autoFocus /></div>
          <div className="row2">
            <div className="fg"><label>Fecha inicio</label><input type="date" value={fechaI} onChange={e => setFechaI(e.target.value)} /></div>
            <div className="fg"><label>Fecha fin</label><input type="date" value={fechaF} onChange={e => setFechaF(e.target.value)} /></div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg3)', borderRadius: 7, padding: '8px 11px' }}>
            Los totales (m³, cobro, pago) se calcularán automáticamente al agregar viajes.
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── PANTALLA 3: DETALLE ESTIMACIÓN ───────────────────────────────
function PantallaDetalle({ est, onBack }) {
  const { viajes, estimaciones, agremiados, vCobro, vPago, vM3, fmt, updateViaje, uploadFoto,
          supabase: _s, perm, loadAll } = useApp()
  const toast = useToast()
  const p = perm()
  const [showAgregar, setShowAgregar] = useState(false)
  const [selec, setSelec]             = useState(new Set())
  const [fDesde, setFDesde]           = useState('')
  const [fHasta, setFHasta]           = useState('')
  const [fAgr, setFAgr]               = useState('')
  const [podFile, setPodFile]         = useState(null)
  const [closing, setClosing]         = useState(false)
  const [detalleV, setDetalleV]       = useState(null)

  // Viajes de esta estimación
  const vsEst = viajes.filter(v => v.estimacion_id === est.id)
  // Viajes pendientes de conciliar (para agregar)
  const vsPend = viajes.filter(v => {
    if (!['abierto','pendiente_conciliar'].includes(v.estado)) return false
    if (v.estimacion_id === est.id) return false
    if (fDesde && v.fecha_salida < fDesde) return false
    if (fHasta && v.fecha_salida > fHasta) return false
    if (fAgr   && v.agremiado_id !== fAgr) return false
    return true
  })

  const totalM3  = vsEst.reduce((a,v) => a + vM3(v), 0)
  const totalCob = vsEst.reduce((a,v) => a + vCobro(v), 0)
  const totalPag = vsEst.reduce((a,v) => a + vPago(v), 0)
  const totalUtil = totalCob - totalPag

  // Selección masiva
  function toggleAll() { setSelec(vsPend.size === selec.size ? new Set() : new Set(vsPend.map(v=>v.id))) }
  function toggleV(id) { const s=new Set(selec); s.has(id)?s.delete(id):s.add(id); setSelec(s) }

  const selecViajes = vsPend.filter(v => selec.has(v.id))
  const selM3  = selecViajes.reduce((a,v)=>a+vM3(v),0)
  const selCob = selecViajes.reduce((a,v)=>a+vCobro(v),0)

  async function handleAgregarViajes() {
    if (!selec.size) return toast('Selecciona al menos un viaje', 'warn')
    try {
      for (const id of selec) {
        await updateViaje(id, { estimacion_id: est.id, estado: 'en_conciliacion' })
      }
      await loadAll()
      toast(`${selec.size} viaje(s) agregados a la estimación ✓`, 'ok')
      setSelec(new Set()); setShowAgregar(false)
    } catch (err) { toast(err.message, 'err') }
  }

  function exportarExcel() {
    const vsEst = viajes.filter(v => v.estimacion_id === est.id)
    const headers = ['Folio','Gondola','M³','Tipo','Tracto','KM','Origen','Destino','Operador','Agremiado','Fecha Salida','Hora Salida','Fecha Llegada','Estado','Cobro','Pago']
    const data = []
    vsEst.forEach(v => {
      const ag = agremiados?.find(a=>a.id===v.agremiado_id)?.nombre||''
      const base = [v.tipo, v.tracto, v.km||0, v.origen||'', v.destino||'', v.operador||'', ag, v.fecha_salida||'', v.hora_salida||'', v.fecha_llegada||'', v.estado, vCobro(v), vPago(v)]
      data.push([v.id, v.gondola1||'', v.m3_1||0, ...base])
      if (v.tipo === 'full') data.push([v.folio2||'', v.gondola2||'', v.m3_2||0, ...base])
    })
    const csv = [headers, ...data].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`${est.id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleQuitarViaje(id) {
    try {
      await updateViaje(id, { estimacion_id: null, estado: 'pendiente_conciliar' })
      toast('Viaje removido', 'ok')
    } catch (err) { toast(err.message, 'err') }
  }

  function imprimirCaratula() {
    const vsEst = viajes.filter(v => v.estimacion_id === est.id)
    const totalM3   = vsEst.reduce((a,v)=>a+vM3(v),0)
    const totalCob  = vsEst.reduce((a,v)=>a+vCobro(v),0)
    const totalPag  = vsEst.reduce((a,v)=>a+vPago(v),0)
    const totalUtil = totalCob - totalPag
    const senc = vsEst.filter(v=>v.tipo==='sencillo').length
    const full = vsEst.filter(v=>v.tipo==='full').length

    // Por agremiado
    const porAgr = (agremiados||[]).map(a => {
      const vs = vsEst.filter(v=>v.agremiado_id===a.id)
      if (!vs.length) return null
      return { nombre:a.nombre, viajes:vs.length, m3:vs.reduce((x,v)=>x+vM3(v),0), cobro:vs.reduce((x,v)=>x+vCobro(v),0), pago:vs.reduce((x,v)=>x+vPago(v),0) }
    }).filter(Boolean)

    const rows = vsEst.map(v => `
      <tr>
        <td style="font-family:monospace;font-size:11px;color:#b45309">${v.id}${v.folio2?'<br><span style="color:#999;font-size:10px">'+v.folio2+'</span>':''}</td>
        <td>${v.tipo.toUpperCase()}</td>
        <td style="font-family:monospace">${v.tracto}</td>
        <td>${agremiados?.find(a=>a.id===v.agremiado_id)?.nombre||'—'}</td>
        <td style="text-align:right;font-family:monospace">${vM3(v)}</td>
        <td style="text-align:right">${v.km||'—'}</td>
        <td style="text-align:right;color:#166534;font-family:monospace">${fmt(vCobro(v))}</td>
        <td style="text-align:right;color:#991b1b;font-family:monospace">${fmt(vPago(v))}</td>
        <td>${v.estado}</td>
      </tr>`).join('')

    const agRows = porAgr.map(a => `
      <tr>
        <td><b>${a.nombre}</b></td>
        <td style="text-align:center">${a.viajes}</td>
        <td style="text-align:right;font-family:monospace">${a.m3.toFixed(2)}</td>
        <td style="text-align:right;color:#166534;font-family:monospace">${fmt(a.cobro)}</td>
        <td style="text-align:right;color:#991b1b;font-family:monospace">${fmt(a.pago)}</td>
        <td style="text-align:right;color:#5b21b6;font-family:monospace;font-weight:700">${fmt(a.cobro-a.pago)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>${est.id}</title>
    <style>
      body{font-family:sans-serif;font-size:12px;margin:24px;color:#111}
      h1{font-size:20px;margin:0}h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #f59e0b;padding-bottom:4px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
      .kpi-l{font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700}
      .kpi-v{font-size:22px;font-weight:700;font-family:monospace;margin-top:4px}
      .util{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:12px 0;background:#f9fafb;border-radius:8px;padding:12px}
      .util div{text-align:center}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
      th{background:#f3f4f6;padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:2px solid #e5e7eb}
      td{padding:5px 8px;border-bottom:1px solid #f3f4f6}
      tr:nth-child(even){background:#fafafa}
      .footer{margin-top:24px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}
      @media print{body{margin:12px}.no-print{display:none}}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div>
        <h1 style="color:#b45309">${est.id}</h1>
        <div style="font-size:16px;font-weight:700">${est.nombre||'Estimación'}</div>
        <div style="color:#6b7280;font-size:12px">${est.fecha_inicio||''} → ${est.fecha_fin||''}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:11px;color:#6b7280">CATEM México · Sindicato JSV</div>
        <div style="font-size:11px;color:#6b7280">Generado: ${new Date().toLocaleString('es-MX')}</div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="kpi-l">Viajes</div><div class="kpi-v" style="color:#b45309">${vsEst.length}</div><div style="font-size:10px;color:#6b7280">${senc} senc · ${full} full</div></div>
      <div class="kpi"><div class="kpi-l">M³ Total</div><div class="kpi-v" style="color:#1d4ed8">${totalM3.toFixed(2)}</div></div>
      <div class="kpi"><div class="kpi-l">Cobro Total</div><div class="kpi-v" style="color:#166534">${fmt(totalCob)}</div></div>
      <div class="kpi"><div class="kpi-l">Pago Camioneros</div><div class="kpi-v" style="color:#991b1b">${fmt(totalPag)}</div></div>
    </div>
    <div class="util">
      <div><div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700">Utilidad Total</div><div style="font-size:20px;font-weight:700;font-family:monospace;color:#5b21b6">${fmt(totalUtil)}</div></div>
      <div><div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700">CATEM (50%)</div><div style="font-size:18px;font-weight:700;font-family:monospace;color:#5b21b6">${fmt(totalUtil/2)}</div></div>
      <div><div style="font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700">JSV (50%)</div><div style="font-size:18px;font-weight:700;font-family:monospace;color:#5b21b6">${fmt(totalUtil/2)}</div></div>
    </div>

    <h2>Resumen por agremiado</h2>
    <table><thead><tr><th>Agremiado</th><th>Viajes</th><th>M³</th><th>Cobro</th><th>Pago</th><th>Utilidad</th></tr></thead>
    <tbody>${agRows}</tbody></table>

    <h2>Detalle de viajes (${vsEst.length})</h2>
    <table><thead><tr><th>Ticket</th><th>Tipo</th><th>Tracto</th><th>Agremiado</th><th>M³</th><th>KM</th><th>Cobro</th><th>Pago</th><th>Estado</th></tr></thead>
    <tbody>${rows}</tbody></table>

    <div class="footer">JSV Tracking · ${est.id} · ${new Date().toLocaleString('es-MX')}</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  async function exportarFotosPDF() {
    const vsEst = viajes.filter(v => v.estimacion_id === est.id)
    const canvas = document.createElement('canvas')
    canvas.width = 794; canvas.height = vsEst.length * 420 + 80
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height)

    const loadImg = url => new Promise(res => {
      if (!url) { res(null); return }
      const img = new Image(); img.crossOrigin='anonymous'
      img.onload=()=>res(img); img.onerror=()=>res(null); img.src=url
    })

    ctx.fillStyle='#111318'; ctx.fillRect(0,0,794,50)
    ctx.fillStyle='#F59E0B'; ctx.font='bold 16px monospace'
    ctx.fillText(`${est.id} — Fotos de tickets`, 20, 32)

    let y = 60
    for (const v of vsEst) {
      ctx.fillStyle='#F3F4F6'; ctx.fillRect(10, y, 774, 400)
      ctx.fillStyle='#111318'; ctx.font='bold 13px monospace'
      ctx.fillText(`${v.id}${v.folio2?' / '+v.folio2:''} · ${v.tracto} · ${v.operador} · ${v.fecha_salida||''}`, 20, y+22)
      ctx.fillStyle='#6B7280'; ctx.font='11px sans-serif'
      ctx.fillText(`${v.origen||'—'} → ${v.destino||'—'} · ${vM3(v)} m³`, 20, y+40)

      const imgSal  = await loadImg(v.foto_ticket_salida_url)
      const imgLleg = await loadImg(v.foto_ticket_llegada_url)
      const drawPhoto = (img, x, iy, label, hasRecord) => {
        ctx.fillStyle = img ? '#E5E7EB' : hasRecord ? '#FEF3C7' : '#FEE2E2'
        ctx.fillRect(x, iy, 370, 310)
        ctx.fillStyle='#374151'; ctx.font='bold 11px sans-serif'; ctx.fillText(label, x+10, iy+20)
        if (img) {
          const ratio = Math.min(360/img.width, 280/img.height)
          const w=img.width*ratio, h=img.height*ratio
          ctx.drawImage(img, x+(370-w)/2, iy+25+(280-h)/2, w, h)
        } else {
          ctx.fillStyle = hasRecord ? '#92400E' : '#991B1B'
          ctx.font = 'bold 13px sans-serif'
          const msg = hasRecord ? '⚠ Sin foto adjunta' : '✗ NO EXISTE TICKET DE LLEGADA'
          ctx.fillText(msg, x + (370 - ctx.measureText(msg).width)/2, iy+165)
          if (!hasRecord) {
            ctx.fillStyle='#DC2626'; ctx.font='11px sans-serif'
            const sub = 'Pendiente de registrar'
            ctx.fillText(sub, x + (370 - ctx.measureText(sub).width)/2, iy+185)
          }
        }
      }
      drawPhoto(imgSal,  14,  y+50, '📄 TICKET SALIDA',  !!v.foto_ticket_salida)
      drawPhoto(imgLleg, 394, y+50, '📄 TICKET LLEGADA', !!v.fecha_llegada)
      y += 420
    }

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href=url; a.download=`${est.id}-fotos.png`; a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  async function handleCerrar() {
    if (!window.confirm('¿Cerrar esta estimación? Todos los viajes quedarán como Cerrados.')) return
    setClosing(true)
    try {
      let podUrl = est.pod_url || null
      if (podFile) podUrl = await uploadFoto(podFile, `pods/${est.id}`)
      // Update estimacion
      await supabase.from('estimaciones').update({ estado: 'cerrada', pod_url: podUrl }).eq('id', est.id)
      // Close all viajes
      for (const v of vsEst) await updateViaje(v.id, { estado: 'cerrado' })
      toast(`Estimación ${est.id} cerrada ✓`, 'ok')
      await loadAll()
      onBack()
    } catch (err) { toast(err.message, 'err') }
    setClosing(false)
  }

  async function handleReabrir() {
    if (!p.canTodo) return toast('Solo admin puede reabrir', 'err')
    try {
      await supabase.from('estimaciones').update({ estado: 'abierta' }).eq('id', est.id)
      toast('Estimación reabierta', 'warn')
      await loadAll()
    } catch (err) { toast(err.message, 'err') }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-out btn-sm" onClick={onBack}><i className="ti ti-arrow-left" />{est.year}</button>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--acc)' }}>{est.id}</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{est.descripcion}</div>
          {(est.fecha_inicio || est.fecha_fin) && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{est.fecha_inicio||'?'} → {est.fecha_fin||'?'}</div>}
        </div>
        <div style={{ marginLeft: 8 }}><Pill s={est.estado} /></div>
        <div style={{ flex: 1 }} />
        {est.estado === 'abierta' && p.canConciliar && (
          <button className="btn btn-acc btn-sm" onClick={() => setShowAgregar(true)}>
            <i className="ti ti-plus" />Agregar viajes
          </button>
        )}
        {est.estado === 'cerrada' && p.canTodo && (
          <button className="btn btn-danger btn-sm" onClick={handleReabrir}><i className="ti ti-lock-open" />Reabrir</button>
        )}
      </div>

      {/* KPIs */}
      <div className="kpis kpis-4" style={{ marginBottom: 14 }}>
        <div className="kpi acc"><div className="kpi-l">Viajes</div><div className="kpi-v">{vsEst.length}</div></div>
        <div className="kpi"><div className="kpi-l">M³ Total</div><div className="kpi-v" style={{ color: 'var(--info)' }}>{totalM3.toFixed(2)}</div></div>
        <div className="kpi grn"><div className="kpi-l">Cobro total</div><div className="kpi-v">{fmt(totalCob)}</div></div>
        <div className="kpi pur"><div className="kpi-l">Utilidad</div><div className="kpi-v">{fmt(totalUtil)}</div></div>
      </div>
      <div className="split" style={{ marginBottom: 14 }}>
        <div className="spi"><div className="spl">Pago camioneros</div><div className="spv" style={{ color: 'var(--pago)' }}>{fmt(totalPag)}</div></div>
        <div className="spi" style={{ borderLeft: '1px solid var(--border)' }}><div className="spl">CATEM (50%)</div><div className="spv">{fmt(totalUtil/2)}</div></div>
        <div className="spi" style={{ borderLeft: '1px solid var(--border)' }}><div className="spl">JSV (50%)</div><div className="spv">{fmt(totalUtil/2)}</div></div>
      </div>

      {/* POD y cierre */}
      {est.estado === 'abierta' && p.canConciliar && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>POD firmado <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 10 }}>(opcional — puedes subirlo después)</span></div>
            <FotoSlot label="Subir POD firmado (PDF o imagen)" icon="file-type-pdf" accept="application/pdf,image/*" onCapture={setPodFile} done={!!podFile || !!est.pod_url} />
          </div>
          <button className="btn btn-ok" style={{ padding: '12px 20px', flexShrink: 0 }} onClick={handleCerrar} disabled={closing}>
            <i className="ti ti-lock" style={{ fontSize: 16 }} />{closing ? 'Cerrando...' : 'Cerrar estimación'}
          </button>
        </div>
      )}
      {est.pod_url && (
        <div style={{ marginBottom: 14 }}>
          <a href={est.pod_url} target="_blank" className="btn btn-out btn-sm"><i className="ti ti-file-type-pdf" />Ver POD firmado</a>
        </div>
      )}

      {/* Tabla viajes */}
      <div className="tc">
        <div className="tc-h">
          <span className="tc-t">Viajes en esta estimación ({vsEst.length})</span>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-out btn-sm" onClick={imprimirCaratula}><i className="ti ti-printer" />Imprimir</button>
            <button className="btn btn-out btn-sm" onClick={exportarExcel}><i className="ti ti-table-export" />Excel</button>
            <button className="btn btn-out btn-sm" onClick={exportarFotosPDF}><i className="ti ti-file-download" />Fotos</button>
          </div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>TICKET</th><th>TRACTO</th><th>TIPO</th><th>OPERADOR</th><th>M³</th><th>KM</th><th>COBRO</th><th>PAGO</th><th>ESTADO</th><th>FOTOS</th>{est.estado==='abierta'&&p.canConciliar&&<th>QUITAR</th>}</tr></thead>
            <tbody>
              {vsEst.length ? vsEst.map(v => (
                <tr key={v.id} className="tr" onClick={() => setDetalleV(v)} style={{ cursor:'pointer' }}>
                  <td>
                    <span className="mono" style={{ color: 'var(--acc)', fontWeight:700 }}>{v.id}</span>
                    {v.folio2 && <div className="mono" style={{ color: 'var(--muted)', fontSize:9 }}>{v.folio2}</div>}
                  </td>
                  <td><b>{v.tracto}</b></td>
                  <td><Pill s={v.tipo} /></td>
                  <td style={{ fontSize: 10 }}>{v.operador}</td>
                  <td className="mono">{vM3(v)}</td>
                  <td className="mono">{v.km}</td>
                  <td className="mono" style={{ color: 'var(--cobro)' }}>{fmt(vCobro(v))}</td>
                  <td className="mono" style={{ color: 'var(--pago)' }}>{fmt(vPago(v))}</td>
                  <td><Pill s={v.estado} /></td>
                  <td>
                    <span className={`pill ${v.foto_ticket_salida?'pg':'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>T.Sal</span>
                    <span className={`pill ${v.foto_ticket_llegada?'pg':'pr'}`} style={{ fontSize: 8 }}>T.Lle</span>
                  </td>
                  {est.estado==='abierta'&&p.canConciliar&&(
                    <td><button className="btn btn-danger btn-xs" onClick={() => handleQuitarViaje(v.id)}><i className="ti ti-x" /></button></td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={11} style={{ textAlign:'center', padding: 20, color: 'var(--muted)' }}>Sin viajes — usa "Agregar viajes" para incluirlos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal agregar viajes */}
      {showAgregar && (
        <div className="ov" onClick={e => e.target.classList.contains('ov') && setShowAgregar(false)}>
          <div className="modal" style={{ width: 680, maxWidth: '95vw', maxHeight: '90vh' }}>
            <div className="mh">
              <div className="mt2">Agregar viajes a {est.id}</div>
              <button className="mx" onClick={() => setShowAgregar(false)}>×</button>
            </div>
            <div className="mb">
              {/* Totales seleccionados */}
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 13px', marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
                <div><span style={{ color: 'var(--muted)' }}>Seleccionados: </span><b>{selec.size}</b></div>
                <div><span style={{ color: 'var(--muted)' }}>M³: </span><b>{selM3.toFixed(2)}</b></div>
                <div><span style={{ color: 'var(--muted)' }}>Cobro: </span><b style={{ color: 'var(--cobro)', fontFamily: "'Space Mono',monospace" }}>{fmt(selCob)}</b></div>
              </div>
              {/* Filtros */}
              <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
                <input type="date" value={fDesde} onChange={e=>setFDesde(e.target.value)}
                  style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} title="Desde" />
                <span style={{ fontSize:11, color:'var(--muted)' }}>→</span>
                <input type="date" value={fHasta} onChange={e=>setFHasta(e.target.value)}
                  style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)' }} title="Hasta" />
                <select value={fAgr} onChange={e=>setFAgr(e.target.value)}
                  style={{ height:28, fontSize:11, padding:'0 7px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text)', minWidth:130 }}>
                  <option value="">Todos los agremiados</option>
                  {agremiados?.filter(a=>a.activo!==false).map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                {(fDesde||fHasta||fAgr) && (
                  <button className="btn btn-out btn-xs" onClick={()=>{setFDesde('');setFHasta('');setFAgr('')}}>
                    <i className="ti ti-x"/>Limpiar
                  </button>
                )}
              </div>

              {/* Seleccionar todos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
    Viajes disponibles ({vsPend.length}) — 
    <span style={{ color: 'var(--acc)' }}> {vsPend.filter(v=>v.estado==='abierto').length} abiertos</span>
    <span style={{ color: 'var(--ok)' }}> · {vsPend.filter(v=>v.estado==='pendiente_conciliar').length} con llegada</span>
  </div>
                <button className="btn btn-out btn-xs" onClick={() => setSelec(selec.size===vsPend.length?new Set():new Set(vsPend.map(v=>v.id)))}>
                  {selec.size===vsPend.length?'Deseleccionar todos':'Seleccionar todos'}
                </button>
              </div>
              {/* Lista */}
              <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                {vsPend.length ? vsPend.map(v => (
                  <div key={v.id} className="chkr">
                    <input type="checkbox" checked={selec.has(v.id)} onChange={() => toggleV(v.id)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--acc)', fontSize: 11, fontWeight:700 }}>{v.id}</span>
                        {v.folio2 && <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--muted)', fontSize: 10 }}>+ {v.folio2}</span>}
                        <span className={`pill ${v.tipo==='full'?'pp':'pgr'}`} style={{ fontSize:8 }}>{v.tipo.toUpperCase()}</span>
                        {v.estado === 'abierto'
                          ? <span className="pill pa" style={{ fontSize:8 }}>⚠ Abierto (sin llegada)</span>
                          : <span className="pill pg" style={{ fontSize:8 }}>✓ Con llegada</span>
                        }
                      </div>
                      <span style={{ fontSize: 11 }}>{v.tracto} · {v.operador}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}> · {v.fecha_salida||'—'}</span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{vM3(v)} m³</div>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: 'var(--cobro)' }}>{fmt(vCobro(v))}</div>
                    </div>
                  </div>
                )) : (
                  <div className="empty" style={{ padding: 20 }}><p>Sin viajes pendientes de conciliar</p></div>
                )}
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-out" onClick={() => setShowAgregar(false)}>Cancelar</button>
              <button className="btn btn-acc" onClick={handleAgregarViajes} disabled={!selec.size}>
                <i className="ti ti-circle-check" />Agregar {selec.size} viaje(s)
              </button>
            </div>
          </div>
        </div>
      )}
      {detalleV && <ModalDetalleViaje viaje={detalleV} onClose={() => setDetalleV(null)} />}
    </div>
  )
}

// ── VISTA PRINCIPAL ───────────────────────────────────────────────
export default function ViewEstimaciones() {
  const [anio, setAnio]   = useState(null)
  const [est, setEst]     = useState(null)

  if (est)  return <PantallaDetalle est={est} onBack={() => setEst(null)} />
  if (anio) return <PantallaEstimaciones anio={anio} onBack={() => setAnio(null)} onSelectEst={setEst} />
  return <PantallaAnios onSelectAnio={setAnio} />
}
