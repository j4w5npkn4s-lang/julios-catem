import { useState, useMemo } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalPago({ viajes: viajesSelec, onClose, onSaved }) {
  const { registrarPago, vPago, vM3, fmt, uploadFoto, today } = useApp()
  const toast = useToast()

  const isMasivo  = viajesSelec.length > 1
  const totalPago = viajesSelec.reduce((a, v) => a + vPago(v), 0)

  const [fecha, setFecha]   = useState(today())
  const [monto, setMonto]   = useState(totalPago.toFixed(2))
  const [folio, setFolio]   = useState('')
  const [foto, setFoto]     = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!monto) return toast('Ingresa el monto', 'err')
    setSaving(true)
    try {
      let url = null
      if (foto) url = await uploadFoto(foto, `pagos/${Date.now()}`)
      await registrarPago(
        viajesSelec.map(v => v.id),
        { fecha, monto: parseFloat(monto), folio, comprobante_url: url }
      )
      toast(`✓ Pago registrado · ${viajesSelec.length} viaje(s)`, 'ok')
      onSaved?.()
      onClose()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isMasivo ? `Pago masivo · ${viajesSelec.length} tickets` : 'Pago al camionero'} onClose={onClose} lg={isMasivo}
      footer={<>
        <button className="btn btn-out" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ok" onClick={handleSave} disabled={saving}>
          <i className="ti ti-circle-check" />{saving ? 'Guardando...' : `Registrar pago · ${viajesSelec.length} viaje(s)`}
        </button>
      </>}
    >
      {/* Resumen */}
      <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 7, padding: '10px 13px', marginBottom: 12, fontSize: 11, color: 'var(--ok)' }}>
        {isMasivo ? (
          <>
            <b style={{ fontSize: 13 }}>{viajesSelec.length} viajes seleccionados</b>
            <div style={{ marginTop: 4 }}>
              Total a pagar: <b style={{ fontFamily: "'Space Mono',monospace", fontSize: 14 }}>{fmt(totalPago)}</b>
            </div>
          </>
        ) : (
          <>
            Ticket <b>{viajesSelec[0].id}</b> · {viajesSelec[0].operador} · {viajesSelec[0].tracto}<br />
            A pagar: <b style={{ fontFamily: "'Space Mono',monospace" }}>{fmt(vPago(viajesSelec[0]))}</b>
            {' '}({vM3(viajesSelec[0])} m³ × {viajesSelec[0].km} km)
          </>
        )}
      </div>

      {/* Lista viajes masivo */}
      {isMasivo && (
        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 12 }}>
          {viajesSelec.map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
              <div>
                <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--acc)', fontWeight: 700 }}>{v.id}</span>
                <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{v.tracto} · {v.operador}</span>
              </div>
              <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--pago)', fontWeight: 700 }}>{fmt(vPago(v))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Formulario */}
      <div className="row2">
        <div className="fg"><label>Fecha pago</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div className="fg">
          <label>Monto total (MXN)</label>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', fontSize:13, fontWeight:600, pointerEvents:'none' }}>$</span>
            <input
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="0.00"
              step="0.01"
              style={{ paddingLeft: 22, fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700 }}
            />
          </div>
          {monto && !isNaN(parseFloat(monto)) && (
            <div style={{ fontSize:11, color:'var(--ok)', marginTop:4, fontFamily:"'Space Mono',monospace" }}>
              {new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(parseFloat(monto))}
            </div>
          )}
        </div>
      </div>
      <div className="fg"><label>Folio / Referencia</label><input value={folio} onChange={e => setFolio(e.target.value)} placeholder="REF-001" /></div>
      <FotoSlot label="Comprobante de pago (foto o PDF)" icon="file-invoice" accept="image/*,.pdf" onCapture={setFoto} done={!!foto} />
    </Modal>
  )
}
