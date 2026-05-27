import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'

export default function ModalPago({ viajes: viajesSelec, onClose, onSaved }) {
  const { registrarPago, vPago, vM3, fmt, uploadFoto, today } = useApp()
  const toast = useToast()
  const [fecha, setFecha]   = useState(today())
  const [monto, setMonto]   = useState('')
  const [folio, setFolio]   = useState('')
  const [foto, setFoto]     = useState(null)
  const [saving, setSaving] = useState(false)

  const isMasivo = viajesSelec.length > 1
  const totalPago = viajesSelec.reduce((a, v) => a + vPago(v), 0)

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
      toast(`✓ Pago registrado · ${viajesSelec.length} viaje(s) cerrado(s)`, 'ok')
      onSaved?.()
      onClose()
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isMasivo ? 'Pago masivo a camioneros' : 'Pago al camionero'} onClose={onClose} lg={isMasivo}
      footer={<>
        <button className="btn btn-out" onClick={onClose}>Cancelar</button>
        <button className="btn btn-ok" onClick={handleSave} disabled={saving}>
          <i className="ti ti-circle-check" />{saving ? 'Guardando...' : 'Registrar pago · cerrar viaje(s)'}
        </button>
      </>}
    >
      {/* Info de viajes */}
      <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 7, padding: '9px 12px', marginBottom: 12, fontSize: 11, color: 'var(--ok)' }}>
        {isMasivo ? (
          <>
            <b>{viajesSelec.length} viajes seleccionados</b>
            <div style={{ marginTop: 4 }}>
              Total a pagar: <b style={{ fontFamily: "'Space Mono',monospace" }}>{fmt(totalPago)}</b>
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

      {/* Lista de viajes en pago masivo */}
      {isMasivo && (
        <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 12 }}>
          {viajesSelec.map(v => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
              <span><span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--acc)' }}>{v.id}</span> · {v.tracto} · {v.operador}</span>
              <span style={{ fontFamily: "'Space Mono',monospace", color: 'var(--pago)' }}>{fmt(vPago(v))}</span>
            </div>
          ))}
        </div>
      )}

      <div className="row2">
        <div className="fg"><label>Fecha pago</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div className="fg"><label>Monto total ($)</label><input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" /></div>
      </div>
      <div className="fg"><label>Folio / Referencia</label><input value={folio} onChange={e => setFolio(e.target.value)} placeholder="REF-001" /></div>
      <FotoSlot label="Comprobante de pago (foto o PDF)" icon="file-invoice" accept="image/*,.pdf" onCapture={setFoto} />
    </Modal>
  )
}
