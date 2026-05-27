import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import ModalViajesAgremiado from '../components/ModalViajesAgremiado'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import Pill from '../components/Pill'

export default function ViewAgremiados() {
  const { agremiados, flotilla, addAgremiado, updateAgremiado, deleteAgremiado, perm } = useApp()
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editA, setEditA]         = useState(null)
  const [nombre, setNombre]       = useState('')
  const [telefono, setTelefono]   = useState('')
  const [correo, setCorreo]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')
  const [viajesAgr, setViajesAgr] = useState(null)
  const p = perm()

  const activos = agremiados.filter(a => a.activo !== false)
  const filtered = activos.filter(a =>
    !search || a.nombre.toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditA(null); setNombre(''); setTelefono(''); setCorreo(''); setShowModal(true)
  }
  function openEdit(a) {
    setEditA(a); setNombre(a.nombre); setTelefono(a.telefono||''); setCorreo(a.correo||''); setShowModal(true)
  }

  async function handleSave() {
    if (!nombre.trim()) return toast('El nombre es requerido', 'err')
    setSaving(true)
    try {
      if (editA) {
        await updateAgremiado(editA.id, { nombre: nombre.trim(), telefono, correo })
        toast('Agremiado actualizado ✓', 'ok')
      } else {
        await addAgremiado({ nombre: nombre.trim(), telefono, correo })
        toast('Agremiado registrado ✓', 'ok')
      }
      setShowModal(false)
    } catch (err) { toast(err.message, 'err') }
    setSaving(false)
  }

  async function handleDelete(a) {
    const camiones = flotilla.filter(f => f.agremiado_id === a.id && f.activo !== false)
    if (camiones.length > 0) return toast(`${a.nombre} tiene ${camiones.length} camión(es) activo(s). Reasígnalos primero.`, 'warn')
    if (!window.confirm(`¿Eliminar a ${a.nombre}?`)) return
    try {
      await deleteAgremiado(a.id)
      toast('Agremiado eliminado', 'ok')
    } catch (err) { toast(err.message, 'err') }
  }

  // Count camiones per agremiado
  const camionesCount = id => flotilla.filter(f => f.agremiado_id === id && f.activo !== false).length
  const viajesCount   = id => 0 // placeholder

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar agremiado..."
          style={{ flex: 1, maxWidth: 280, height: 32, fontSize: 12, padding: '0 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)' }} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{filtered.length} agremiado(s)</span>
        {p.canConfig && (
          <button className="btn btn-acc btn-sm" onClick={openNew}>
            <i className="ti ti-plus" />Nuevo agremiado
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10 }}>
        {filtered.map(a => {
          const nCam = camionesCount(a.id)
          return (
            <div key={a.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{a.nombre}</div>
                  {a.telefono && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}><i className="ti ti-phone" style={{ fontSize: 10, marginRight: 4 }} />{a.telefono}</div>}
                  {a.correo   && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}><i className="ti ti-mail"  style={{ fontSize: 10, marginRight: 4 }} />{a.correo}</div>}
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button className="btn btn-info btn-xs" onClick={() => setViajesAgr(a)} title="Ver viajes"><i className="ti ti-truck" /></button>
                  {p.canConfig && <button className="btn btn-out btn-xs" onClick={() => openEdit(a)}><i className="ti ti-edit" /></button>}
                  {p.canTodo   && <button className="btn btn-danger btn-xs" onClick={() => handleDelete(a)}><i className="ti ti-trash" /></button>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--acc)' }}>{nCam}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Camiones</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: nCam > 0 ? 'var(--ok)' : 'var(--muted)' }}>
                    {nCam > 0 ? 'Activo' : 'Sin camiones'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase' }}>Estado</div>
                </div>
              </div>
            </div>
          )
        })}
        {!filtered.length && (
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            <i className="ti ti-users" />
            <p>{search ? 'Sin resultados' : 'Sin agremiados registrados'}</p>
          </div>
        )}
      </div>

      {viajesAgr && <ModalViajesAgremiado agremiado={viajesAgr} onClose={() => setViajesAgr(null)} />}

      {showModal && (
        <Modal title={editA ? 'Editar agremiado' : 'Nuevo agremiado'} onClose={() => setShowModal(false)}
          footer={<>
            <button className="btn btn-out" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-acc" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </>}>
          <div className="fg"><label>Nombre completo</label><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan Pérez García" autoFocus /></div>
          <div className="fg"><label>Teléfono</label><input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="993 123 4567" /></div>
          <div className="fg"><label>Correo electrónico</label><input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" /></div>
        </Modal>
      )}
    </div>
  )
}
