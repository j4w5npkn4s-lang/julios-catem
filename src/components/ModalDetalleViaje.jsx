import { useState } from 'react'
import ModalEditarViaje from './ModalEditarViaje'
import { useApp } from '../lib/AppContext'
import { useToast } from './Toast'
import ModalPago from './ModalPago'
import Pill from './Pill'

export default function ModalDetalleViaje({ viaje: v, onClose, onReabrir }) {
  const { vCobro, vPago, vUtil, vM3, fmt, pagos, agremiados, perm, loadAll, deleteViaje } = useApp()
  const toast = useToast()
  const p = perm()
  const canVer = p.canVerPrecios

  const [showPago, setShowPago]     = useState(false)
  const [showEdit, setShowEdit]     = useState(false)
  const [generando, setGenerando]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteViaje(v.id)
      toast(`Ticket ${v.id} eliminado`, 'ok')
      onClose()
    } catch (err) {
      toast(err.message, 'err')
      setDeleting(false)
    }
  }

  async function compartirViaje() {
    setGenerando(true)
    try {
      const canvas  = document.createElement('canvas')
      canvas.width  = 800
      canvas.height = 520
      const ctx = canvas.getContext('2d')

      // Fondo
      const grad = ctx.createLinearGradient(0, 0, 800, 520)
      grad.addColorStop(0, '#111318')
      grad.addColorStop(1, '#1A1D24')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 800, 520)

      // Borde naranja arriba
      ctx.fillStyle = '#F59E0B'
      ctx.fillRect(0, 0, 800, 5)

      // Logo pequeño
      await new Promise(resolve => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.save()
          ctx.beginPath()
          ctx.arc(40, 40, 28, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(img, 12, 12, 56, 56)
          ctx.restore()
          resolve()
        }
        img.onerror = resolve
        img.src = '/icon-192.png'
      })

      // Título
      ctx.fillStyle = '#F59E0B'
      ctx.font = 'bold 18px "Space Mono", monospace'
      ctx.fillText('ORDEN DE CARGA · JSV', 82, 32)
      ctx.fillStyle = '#8A8F9E'
      ctx.font = '12px DM Sans, sans-serif'
      ctx.fillText('Sindicato Julios Sánchez Vargas · CATEM México', 82, 52)

      // Separador
      ctx.fillStyle = '#2E3340'
      ctx.fillRect(16, 70, 768, 1)

      // Datos del viaje (columna izquierda)
      const rows = [
        ['FOLIO',    v.id + (v.folio2 ? ' / ' + v.folio2 : '')],
        ['TIPO',     v.tipo?.toUpperCase()],
        ['TRACTO',   v.tracto],
        ['GONDOLA',  v.tipo === 'full' ? `${v.gondola1} + ${v.gondola2||'?'}` : v.gondola1],
        ['M³',       String(vM3(v))],
        ['ORIGEN',   v.origen || '—'],
        ['DESTINO',  v.destino || '—'],
        ['KM',       String(v.km || '—')],
        ['OPERADOR', v.operador],
        ['AGREMIADO',agremiados?.find(a=>a.id===v.agremiado_id)?.nombre || '—'],
        ['FECHA SAL',v.fecha_salida + (v.hora_salida ? ' ' + v.hora_salida : '')],
        ['MATERIAL', v.material || '—'],
      ]

      let y = 95
      rows.forEach(([label, val]) => {
        ctx.fillStyle = '#5A5F6E'
        ctx.font = 'bold 10px DM Sans'
        ctx.fillText(label, 20, y)
        ctx.fillStyle = '#E8E6E0'
        ctx.font = '13px "Space Mono", monospace'
        ctx.fillText(String(val || '—').slice(0, 32), 130, y)
        y += 26
      })

      // Fotos a la derecha
      const fotoSize = 180
      const fotoY    = 80
      const fotoX1   = 460
      const fotoX2   = 460 + fotoSize + 12

      const drawFoto = (url, x, y, label) => new Promise(resolve => {
        if (!url) {
          ctx.fillStyle = '#22262F'
          ctx.fillRect(x, y, fotoSize, fotoSize)
          ctx.fillStyle = '#5A5F6E'
          ctx.font = '11px DM Sans'
          ctx.fillText('Sin foto', x + fotoSize/2 - 22, y + fotoSize/2)
          ctx.fillStyle = '#F59E0B'
          ctx.font = 'bold 10px DM Sans'
          ctx.fillText(label, x, y + fotoSize + 14)
          resolve(); return
        }
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          // Clip rounded rect
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(x, y, fotoSize, fotoSize, 8)
          ctx.clip()
          // Cover fit
          const ratio = Math.max(fotoSize/img.width, fotoSize/img.height)
          const w = img.width * ratio, h = img.height * ratio
          ctx.drawImage(img, x-(w-fotoSize)/2, y-(h-fotoSize)/2, w, h)
          ctx.restore()
          ctx.fillStyle = '#F59E0B'
          ctx.font = 'bold 10px DM Sans'
          ctx.fillText(label, x, y + fotoSize + 14)
          resolve()
        }
        img.onerror = () => {
          ctx.fillStyle = '#22262F'
          ctx.fillRect(x, y, fotoSize, fotoSize)
          ctx.fillStyle = '#F59E0B'
          ctx.font = 'bold 10px DM Sans'
          ctx.fillText(label, x, y + fotoSize + 14)
          resolve()
        }
        img.src = url
      })

      await drawFoto(v.foto_tracto_url, fotoX1, fotoY, 'FOTO TRACTO')
      await drawFoto(v.foto_ticket_salida_url, fotoX2, fotoY, 'TICKET SALIDA')

      // Pie
      ctx.fillStyle = '#2E3340'
      ctx.fillRect(16, 480, 768, 1)
      ctx.fillStyle = '#5A5F6E'
      ctx.font = '11px DM Sans'
      ctx.fillText(`Generado por JSV Tracking · ${new Date().toLocaleString('es-MX')}`, 16, 498)

      // Borde naranja abajo
      ctx.fillStyle = '#F59E0B'
      ctx.fillRect(0, 515, 800, 5)

      const txt = `🚛 *ORDEN DE CARGA · JSV*

*Folio:* ${v.id}${v.folio2?' / '+v.folio2:''}
*Tipo:* ${v.tipo?.toUpperCase()}
*Tracto:* ${v.tracto}
*Gondola:* ${v.tipo==='full'?v.gondola1+' + '+(v.gondola2||'?'):v.gondola1}
*M³:* ${vM3(v)}
*Operador:* ${v.operador}
*Origen:* ${v.origen||'—'}
*Destino:* ${v.destino||'—'}
*Fecha:* ${v.fecha_salida||'—'} ${v.hora_salida||''}

_Generado por JSV Tracking_`

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      const file = new File([blob], `orden-${v.id}.png`, { type: 'image/png' })

      const isAndroid = /Android/i.test(navigator.userAgent)
      const isIOS     = /iPhone|iPad/i.test(navigator.userAgent)

      // En Android/iPhone usar Web Share API para enviar imagen directo
      if ((isAndroid || isIOS) && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: `Orden de Carga · ${v.id}`, text: txt, files: [file] })
        } catch (e) {
          if (e.name !== 'AbortError') {
            // Si falla Web Share, fallback a descarga + WA
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href=url; a.download=`orden-${v.id}.png`; a.click()
            URL.revokeObjectURL(url)
            await new Promise(r => setTimeout(r, 800))
            window.open('https://wa.me/?text='+encodeURIComponent(txt), '_blank')
          }
        }
      } else {
        // En Mac/desktop: descargar imagen + abrir WhatsApp Web con texto
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href=url; a.download=`orden-${v.id}.png`; a.click()
        URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 800))
        window.open('https://wa.me/?text='+encodeURIComponent(txt), '_blank')
      }

    } catch(err) {
      alert('Error: ' + err.message)
    }
    setGenerando(false)
  }

  if (!v) return null

  const pagosList = (pagos || []).filter(pg => pg.viaje_id === v.id)
  const totalPagado = pagosList.reduce((a, pg) => a + (pg.monto || 0), 0)
  const agNombre = (agremiados || []).find(a => a.id === v.agremiado_id)?.nombre || '—'

  const InfoRow = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || 'var(--text)', fontFamily: label.includes('$') || label.includes('M³') || label.includes('KM') ? "'Space Mono',monospace" : 'inherit' }}>{value || '—'}</span>
    </div>
  )

  return (
    <div className="ov" onClick={e => e.target.classList.contains('ov') && onClose()}>
      <div className="modal" style={{ width: 580, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="mh">
          <div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--acc)' }}>{v.id}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <Pill s={v.tipo} />
              <Pill s={v.estado} />
            </div>
          </div>
          <button className="mx" onClick={onClose}>×</button>
        </div>

        <div className="mb">
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>M³ Total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: 'var(--info)' }}>{vM3(v)}</div>
            </div>
            {canVer && <>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Cobro</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: 'var(--cobro)' }}>{fmt(vCobro(v))}</div>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Pago camp.</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: 'var(--pago)' }}>{fmt(vPago(v))}</div>
            </div>
            </>}
          </div>

          {/* Datos del viaje */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div className="sdv">Unidad</div>
              <InfoRow label="Tracto" value={v.tracto} />
              <InfoRow label="Gondola 1" value={v.gondola1} />
              {v.tipo === 'full' && <InfoRow label="Gondola 2" value={v.gondola2} />}
              <InfoRow label="M³ G1" value={v.m3_1} />
              {v.tipo === 'full' && <InfoRow label="M³ G2" value={v.m3_2} />}
              <InfoRow label="Agremiado" value={agNombre} />
              <InfoRow label="Operador" value={v.operador} />
            </div>
            <div>
              <div className="sdv">Ruta</div>
              <InfoRow label="Origen" value={v.origen} />
              <InfoRow label="Destino" value={v.destino} />
              <InfoRow label="KM" value={v.km} />
              <InfoRow label="Material" value={v.material} />
              <div className="sdv" style={{ marginTop: 10 }}>Fechas</div>
              <InfoRow label="Salida" value={`${v.fecha_salida || '—'} ${v.hora_salida || ''}`} />
              <InfoRow label="Llegada" value={`${v.fecha_llegada || '—'} ${v.hora_llegada || ''}`} />
            </div>
          </div>

          {/* Fotos */}
          <div className="sdv" style={{ marginTop: 10 }}>Documentos y fotos</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { label: v.tipo==='full'?'Ticket salida 1':'Ticket salida', ok: v.foto_ticket_salida,  url: v.foto_ticket_salida_url },
              ...(v.tipo==='full' ? [{ label: 'Ticket salida 2', ok: !!v.foto_ticket2_url, url: v.foto_ticket2_url }] : []),
              { label: 'Foto tracto',   ok: v.foto_tracto,        url: v.foto_tracto_url },
              { label: v.tipo==='full'?'Ticket llegada 1':'Ticket llegada', ok: v.foto_ticket_llegada, url: v.foto_ticket_llegada_url },
              ...(v.tipo==='full' ? [{ label: 'Ticket llegada 2', ok: !!v.foto_ticket_llegada2_url, url: v.foto_ticket_llegada2_url }] : []),
            ].map(f => (
              <div key={f.label} style={{ flex: 1, minWidth: 120, background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${f.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}` }}>
                <i className={`ti ti-${f.ok ? 'circle-check' : 'circle-x'}`} style={{ color: f.ok ? 'var(--ok)' : 'var(--err)', fontSize: 16, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600 }}>{f.label}</div>
                  {f.url
                    ? <a href={f.url} target="_blank" style={{ fontSize: 9, color: 'var(--info)' }}>Ver foto →</a>
                    : <div style={{ fontSize: 9, color: 'var(--muted)' }}>Sin foto</div>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Pagos */}
          {pagosList.length > 0 && (
            <>
              <div className="sdv">Pagos registrados</div>
              {pagosList.map(pg => (
                <div key={pg.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                  <span style={{ color: 'var(--muted)' }}>{pg.fecha}</span>
                  <span>{pg.folio || 'Sin folio'}</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--ok)' }}>{fmt(pg.monto)}</span>
                  {pg.comprobante_url && <a href={pg.comprobante_url} target="_blank" style={{ fontSize: 10, color: 'var(--info)' }}>Comprobante</a>}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, fontWeight: 700, padding: '7px 0', color: 'var(--ok)', fontFamily: "'Space Mono',monospace" }}>
                Total pagado: {fmt(totalPagado)}
              </div>
            </>
          )}

          {/* Notas */}
          {v.notas && (
            <>
              <div className="sdv">Notas</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', padding: '6px 0' }}>{v.notas}</div>
            </>
          )}
        </div>

        <div className="mf">
          {v.estado === 'cerrado' && p.canTodo && onReabrir && (
            <button className="btn btn-danger btn-sm" onClick={() => { onReabrir(v.id); onClose() }}>
              <i className="ti ti-lock-open" />Reabrir viaje
            </button>
          )}
          {p.canTodo && (
            confirmDel ? (
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, padding:'4px 8px' }}>
                <span style={{ fontSize:11, color:'var(--err)' }}>¿Eliminar permanentemente?</span>
                <button className="btn btn-out btn-xs" onClick={() => setConfirmDel(false)} disabled={deleting}>No</button>
                <button className="btn btn-danger btn-xs" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(true)}>
                <i className="ti ti-trash" />Eliminar
              </button>
            )
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-out btn-sm" onClick={compartirViaje} disabled={generando}>
            <i className="ti ti-brand-whatsapp" />{generando ? 'Generando...' : 'Compartir'}
          </button>
          {(p.canTodo || p.canRegistrar) && p.canConfig !== false && p.canTodo && (
            <button className="btn btn-out btn-sm" onClick={() => setShowEdit(true)}>
              <i className="ti ti-edit" />Editar ticket
            </button>
          )}
          {v.pagado !== true && p.canPagar && (
            <button className="btn btn-ok btn-sm" onClick={() => setShowPago(true)}>
              <i className="ti ti-cash" />Registrar pago
            </button>
          )}
          {v.pagado === true && (
            <span className="pill pg" style={{ fontSize: 11, padding: '5px 12px' }}>✓ Pagado</span>
          )}
          <button className="btn btn-out" onClick={onClose}>Cerrar</button>
        </div>
      {showPago && <ModalPago viajes={[v]} onClose={() => setShowPago(false)} onSaved={() => { setShowPago(false); onClose() }} />}
      {showEdit && <ModalEditarViaje viaje={v} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); onClose() }} />}
      </div>
    </div>
  )
}
