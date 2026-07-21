import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from './Pill'
import ModalDetalleViaje from './ModalDetalleViaje'

export default function ModalDetallePago({ pago, onClose }) {
  const { viajes, agremiados, pagos, vCobro, vPago, vM3, fmt, reabrirViaje } = useApp()
  const [detalleViaje, setDetalleViaje] = useState(null)

  if (!pago) return null

  // Si es pago masivo, buscar todos los pagos del mismo folio_masivo
  // Si es individual, solo ese viaje
  let viajesList = []
  let totalMonto = 0

  if (pago.masivo && pago.folio_masivo) {
    // Buscar todos los pagos con el mismo folio masivo
    const pagosGrupo = pagos.filter(p => p.folio_masivo === pago.folio_masivo)
    viajesList = pagosGrupo.map(p => ({
      viaje: viajes.find(v => v.id === p.viaje_id),
      monto: p.monto,
      parte: p.parte,
    })).filter(x => x.viaje)
    totalMonto = pagosGrupo.reduce((a, p) => a + (p.monto || 0), 0)
  } else {
    const v = viajes.find(v => v.id === pago.viaje_id)
    if (v) viajesList = [{ viaje: v, monto: pago.monto, parte: pago.parte }]
    totalMonto = pago.monto || 0
  }

  const agNombre = id => agremiados.find(a => a.id === id)?.nombre || '—'

  // Todos los comprobantes únicos del grupo de pago
  const comprobantesUrls = pago.masivo && pago.folio_masivo
    ? [...new Set(pagos.filter(p => p.folio_masivo === pago.folio_masivo && p.comprobante_url).map(p => p.comprobante_url))]
    : pago.comprobante_url ? [pago.comprobante_url] : []

  const totalM3  = viajesList.reduce((a, x) => a + vM3(x.viaje), 0)
  const totalCob = viajesList.reduce((a, x) => a + vCobro(x.viaje), 0)

  async function imprimirComprobante() {
    const rows = viajesList.map(({ viaje: v, monto }) => `
      <tr>
        <td style="font-family:monospace;font-size:11px;color:#b45309">${v.id}</td>
        <td style="font-family:monospace">${v.tracto}</td>
        <td>${v.tipo.toUpperCase()}</td>
        <td>${agNombre(v.agremiado_id)}</td>
        <td>${v.operador||'—'}</td>
        <td style="text-align:right;font-family:monospace">${vM3(v)}</td>
        <td style="text-align:right;font-family:monospace;color:#166534;font-weight:700">${fmt(monto)}</td>
      </tr>`).join('')

    // Convertir imagen URL a base64 para evitar CORS en ventana de impresión
    const toBase64 = async url => {
      try {
        const res = await fetch(url)
        const blob = await res.blob()
        return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob) })
      } catch { return null }
    }

    // Precargar todos los comprobantes como base64
    const comprobantesB64 = await Promise.all(comprobantesUrls.map(toBase64))

    // Tarjetas con fotos de tickets por cada viaje incluido
    // Precargar fotos de tickets como base64
    const allFotoUrls = viajesList.flatMap(({viaje:v}) => [
      v.foto_ticket_salida_url, v.foto_ticket2_url, v.foto_tracto_url,
      v.foto_ticket_llegada_url, v.foto_ticket_llegada2_url
    ].filter(Boolean))
    const fotoB64Map = {}
    await Promise.all(allFotoUrls.map(async url => { fotoB64Map[url] = await toBase64(url) }))

    const fotosViajes = viajesList.map(({ viaje: v }) => {
      const fotos = [
        { label: 'Ticket salida', url: v.foto_ticket_salida_url },
        ...(v.tipo === 'full' ? [{ label: 'Ticket salida 2', url: v.foto_ticket2_url }] : []),
        { label: 'Foto tracto', url: v.foto_tracto_url },
        { label: 'Ticket llegada', url: v.foto_ticket_llegada_url },
        ...(v.tipo === 'full' ? [{ label: 'Ticket llegada 2', url: v.foto_ticket_llegada2_url }] : []),
      ]
      const imgs = fotos.map(f => `
        <div style="flex:1;min-width:140px">
          <div style="font-size:9px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">${f.label}</div>
          ${f.url && fotoB64Map[f.url]
            ? `<img src="${'${fotoB64Map[f.url]}'}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb" />`
            : `<div style="width:100%;height:140px;background:#fef2f2;color:#991b1b;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:11px;text-align:center">Sin foto</div>`
          }
        </div>`).join('')
      return `
        <div style="break-inside:avoid;margin-bottom:18px;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
          <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#111">
            <span style="color:#b45309;font-family:monospace">${v.id}${v.folio2?' / '+v.folio2:''}</span>
            &nbsp;·&nbsp;${v.tracto}&nbsp;·&nbsp;${agNombre(v.agremiado_id)}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">${imgs}</div>
        </div>`
    }).join('')

    const comprobanteHtml = comprobantesUrls.length > 0
      ? `<h2>Comprobante${comprobantesUrls.length>1?'s':''} de pago</h2>
         <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
           ${comprobantesUrls.map((url, i) => {
             const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf')
             const b64 = comprobantesB64[i]
             const label = comprobantesUrls.length > 1 ? `Comprobante ${i+1}` : 'Comprobante'
             if (isPdf) {
               return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;text-align:center;background:#f9fafb;min-width:200px">
                 <div style="font-size:24px;margin-bottom:8px">📄</div>
                 <div style="font-size:11px;color:#6b7280;margin-bottom:8px">${label} (PDF)</div>
                 <a href="${url}" target="_blank" style="background:#166534;color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:11px">Abrir PDF →</a>
               </div>`
             }
             return b64
               ? `<div style="text-align:center"><div style="font-size:10px;color:#6b7280;margin-bottom:4px">${label}</div><img src="${b64}" style="max-width:100%;max-height:400px;border:1px solid #e5e7eb;border-radius:8px" /></div>`
               : `<div style="padding:20px;color:#991b1b;background:#fef2f2;border-radius:8px">Error al cargar ${label}</div>`
           }).join('')}
         </div>`
      : `<h2>Comprobante de pago</h2><div style="padding:20px;text-align:center;color:#991b1b;background:#fef2f2;border-radius:8px;margin-bottom:16px">Sin comprobante adjunto</div>`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Comprobante de pago${pago.folio?' - '+pago.folio:''}</title>
    <style>
      body{font-family:sans-serif;font-size:12px;margin:24px;color:#111}
      h1{font-size:20px;margin:0}h2{font-size:14px;margin:16px 0 6px;border-bottom:2px solid #166534;padding-bottom:4px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
      .kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
      .kpi-l{font-size:10px;color:#6b7280;text-transform:uppercase;font-weight:700}
      .kpi-v{font-size:20px;font-weight:700;font-family:monospace;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}
      th{background:#f3f4f6;padding:5px 8px;text-align:left;font-size:10px;text-transform:uppercase;border-bottom:2px solid #e5e7eb}
      td{padding:5px 8px;border-bottom:1px solid #f3f4f6}
      tr:nth-child(even){background:#fafafa}
      .footer{margin-top:24px;font-size:10px;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}
      @media print{body{margin:12px} .kpi,div[style*="break-inside"]{break-inside:avoid}}
    </style></head><body>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div>
        <h1 style="color:#166534">Comprobante de pago</h1>
        <div style="font-size:13px;color:#6b7280">${pago.masivo ? 'Pago masivo' : 'Pago individual'} · Folio: ${pago.folio||'Sin folio'}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:11px;color:#6b7280">JSV Tracking · Julios Catem</div>
        <div style="font-size:11px;color:#6b7280">Fecha de pago: ${pago.fecha||'—'}</div>
      </div>
    </div>

    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="kpi-l">Viajes</div><div class="kpi-v" style="color:#b45309">${viajesList.length}</div></div>
      <div class="kpi"><div class="kpi-l">M³ Total</div><div class="kpi-v" style="color:#1d4ed8">${totalM3.toFixed(2)}</div></div>
      <div class="kpi"><div class="kpi-l">Monto Pagado</div><div class="kpi-v" style="color:#166534">${fmt(totalMonto)}</div></div>
    </div>

    <h2>Viajes incluidos en este pago</h2>
    <table><thead><tr><th>Ticket</th><th>Tracto</th><th>Tipo</th><th>Agremiado</th><th>Operador</th><th>M³</th><th>Pagado</th></tr></thead>
    <tbody>${rows}</tbody></table>

    ${comprobanteHtml}

    <h2>Fotos de tickets por viaje</h2>
    ${fotosViajes}

    <div class="footer">JSV Tracking · Generado: ${new Date().toLocaleString('es-MX')}</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  return (
    <>
      <div className="ov" onClick={e => e.target.classList.contains('ov') && onClose()}>
        <div className="modal" style={{ width: 620, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div className="mh">
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Detalle de pago</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {pago.masivo ? `Pago masivo · ${viajesList.length} viaje(s)` : 'Pago individual'}
              </div>
            </div>
            <button className="mx" onClick={onClose}>×</button>
          </div>

          {/* Info del pago */}
          <div style={{ padding: '14px 17px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Fecha de pago</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{pago.fecha || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Monto total pagado</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, fontWeight: 700, color: 'var(--ok)' }}>{fmt(totalMonto)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Folio / Referencia</div>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Mono',monospace" }}>{pago.folio || 'Sin folio'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }}>Comprobante</div>
                {pago.comprobante_url
                  ? <a href={pago.comprobante_url} target="_blank" className="btn btn-ok btn-xs">
                      <i className="ti ti-file-invoice" />Ver comprobante
                    </a>
                  : <span style={{ fontSize: 11, color: 'var(--err)' }}>Sin comprobante</span>
                }
              </div>
            </div>
          </div>

          {/* Resumen viajes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '10px 17px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Viajes incluidos</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: 'var(--acc)' }}>{viajesList.length}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>M³ Total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: 'var(--info)' }}>{totalM3.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Cobro total</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--cobro)' }}>{fmt(totalCob)}</div>
            </div>
          </div>

          {/* Lista de viajes */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '8px 17px 4px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Viajes incluidos en este pago
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 1 }}>
                <tr>
                  {['TICKET','TRACTO','TIPO','AGREMIADO','OPERADOR','M³','ORIGEN→DESTINO','MONTO PAGADO','FOTOS'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viajesList.length ? viajesList.map(({ viaje: v, monto }) => (
                  <tr key={v.id}
                    onClick={() => setDetalleViaje(v)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => e.currentTarget.style.background='var(--bg3)'}
                    onMouseOut={e  => e.currentTarget.style.background=''}>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--acc)', fontWeight: 700 }}>{v.id}</td>
                    <td style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600 }}>{v.tracto}</td>
                    <td style={{ padding: '8px 10px' }}><Pill s={v.tipo} /></td>
                    <td style={{ padding: '8px 10px', fontSize: 10 }}>{agNombre(v.agremiado_id)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 10 }}>{v.operador}</td>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{vM3(v)}</td>
                    <td style={{ padding: '8px 10px', fontSize: 10, color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.origen||'—'} → {v.destino||'—'}</td>
                    <td style={{ padding: '8px 10px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: 'var(--ok)', fontWeight: 700 }}>{fmt(monto)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span className={`pill ${v.foto_ticket_salida?'pg':'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>T.S</span>
                      <span className={`pill ${v.foto_tracto?'pg':'pr'}`} style={{ fontSize: 8, marginRight: 2 }}>Tr</span>
                      <span className={`pill ${v.foto_ticket_llegada?'pg':'pr'}`} style={{ fontSize: 8 }}>T.L</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Sin viajes asociados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mf">
            <button className="btn btn-out btn-sm" onClick={imprimirComprobante}>
              <i className="ti ti-printer" />Imprimir
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-out" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>

      {detalleViaje && (
        <ModalDetalleViaje
          viaje={detalleViaje}
          onClose={() => setDetalleViaje(null)}
          onReabrir={id => { reabrirViaje(id); setDetalleViaje(null) }}
        />
      )}
    </>
  )
}
