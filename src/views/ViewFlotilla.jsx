import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import ModalDetalleCamion from '../components/ModalDetalleCamion'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'
import FotoSlot from '../components/FotoSlot'
import Pill from '../components/Pill'

export default function ViewFlotilla() {
  const { flotilla, agremiados, viajes, addCamion, updateCamion, deleteCamion, uploadFoto, perm } = useApp()
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editC, setEditC]         = useState(null)
  const [tipo, setTipo]           = useState('sencillo')
  const [tracto, setTracto]       = useState('')
  const [g1, setG1]               = useState('')
  const [m3g1, setM3g1]           = useState('')
  const [g2, setG2]               = useState('')
  const [m3g2, setM3g2]           = useState('')
  const [agremiadoId, setAgremId] = useState('')
  const [foto, setFoto]           = useState(null)
  const [saving, setSaving]       = useState(false)
  const [filtro, setFiltro]       = useState('todos')
  const [search, setSearch]       = useState('')
  const [detalleCamion, setDetalleCamion] = useState(null)
  const p = perm()

  // Auto-inactive: no trip in 7 days
  const hoy = new Date()
  const esActivo = c => {
    if (c.activo === false) return false
    if (!c.ultimo_viaje) return false
    const diff = (hoy - new Date(c.ultimo_viaje)) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }
  const esSinViaje = c => c.activo !== false && !c.ultimo_viaje

  const filtered = flotilla.filter(c => {
    if (filtro === 'activos')   return esActivo(c)
    if (filtro === 'inactivos') return !esActivo(c) && c.activo !== false
    if (filtro === 'full')      return c.tipo === 'full' && c.activo !== false
    if (filtro === 'sencillo')  return c.tipo === 'sencillo' && c.activo !== false
    return c.activo !== false
  }).filter(c => !search || (c.placa_tracto + (c.placa_gondola1||'')).toLowerCase().includes(search.toLowerCase()))

  const stats = {
    total:    flotilla.filter(c => c.activo !== false).length,
    activos:  flotilla.filter(c => esActivo(c)).length,
    full:     flotilla.filter(c => c.tipo === 'full' && c.activo !== false).length,
    sencillo: flotilla.filter(c => c.tipo === 'sencillo' && c.activo !== false).length,
  }

  function openNew() {
    setEditC(null); setTipo('sencillo'); setTracto(''); setG1(''); setM3g1(''); setG2(''); setM3g2(''); setAgremId(''); setFoto(null); setShowModal(true)
  }
  function openEdit(c) {
    setEditC(c); setTipo(c.tipo); setTracto(c.placa_tracto); setG1(c.placa_gondola1||''); setM3g1(c.m3_gondola1||'')
    setG2(c.placa_gondola2||''); setM3g2(c.m3_gondola2||''); setAgremId(c.agremiado_id||''); setFoto(null); setShowModal(true)
  }

  async function handleSave() {
    if (!tracto.trim()) return toast('Placa tracto requerida', 'err')
    if (!g1.trim()) return toast('Placa gondola 1 requerida', 'err')
    if (!agremiadoId) return toast('Selecciona un agremiado', 'err')
    setSaving(true)
    try {
      let fotoUrl = editC?.foto_tracto_url || null
      if (foto) fotoUrl = await uploadFoto(foto, `flotilla/${tracto.toUpperCase()}`)
      const datos = {
        tipo, placa_tracto: tracto.trim().toUpperCase(),
        placa_gondola1: g1.trim().toUpperCase(), m3_gondola1: parseFloat(m3g1)||0,
        placa_gondola2: tipo==='full' ? g2.trim().toUpperCase() : null,
        m3_gondola2: tipo==='full' ? (parseFloat(m3g2)||0) : 0,
        foto_tracto_url: fotoUrl, agremiado_id: agremiadoId,
      }
      if (editC) { await updateCamion(editC.id, datos); toast('Camión actualizado ✓', 'ok') }
      else        { await addCamion(datos); toast('Camión registrado en flotilla ✓', 'ok') }
      setShowModal(false)
    } catch (err) { toast(err.message, 'err') }
    setSaving(false)
  }

  async function handleDelete(c) {
    if (!window.confirm(`¿Dar de baja ${c.placa_tracto}?`)) return
    try { await deleteCamion(c.id); toast('Camión dado de baja', 'ok') }
    catch (err) { toast(err.message, 'err') }
  }

  const getNombreAgremiado = id => agremiados.find(a => a.id === id)?.nombre || '—'

  return (
    <div>
      {/* KPIs */}
      <div className="kpis kpis-4" style={{ marginBottom: 12 }}>
        <div className="kpi acc clickable" onClick={() => setFiltro('todos')}><div className="kpi-l">Total flotilla</div><div className="kpi-v">{stats.total}</div></div>
        <div className="kpi grn clickable" onClick={() => setFiltro('activos')}><div className="kpi-l">Activos</div><div className="kpi-v">{stats.activos}</div><div className="kpi-s">Viajaron esta semana</div></div>
        <div className="kpi clickable" onClick={() => setFiltro('sencillo')}><div className="kpi-l">Sencillos</div><div className="kpi-v" style={{ color: 'var(--info)' }}>{stats.sencillo}</div></div>
        <div className="kpi clickable" onClick={() => setFiltro('full')}><div className="kpi-l">Full</div><div className="kpi-v" style={{ color: 'var(--util)' }}>{stats.full}</div></div>
      </div>

      {/* Filtros y búsqueda */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="dtabs" style={{ marginBottom: 0, flex: 'none' }}>
          {['todos','activos','inactivos','full','sencillo'].map(f => (
            <button key={f} className={`dtab${filtro===f?' active':''}`} onClick={() => setFiltro(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar placa..."
          style={{ height: 32, fontSize: 11, padding: '0 10px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', width: 150 }} />
        <div style={{ flex: 1 }} />
        {p.canConfig && (
          <button className="btn btn-acc btn-sm" onClick={openNew}><i className="ti ti-plus" />Agregar camión</button>
        )}
      </div>

      {/* Tabla */}
      <div className="tc">
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>TRACTO</th><th>TIPO</th><th>GONDOLA 1</th><th>M³</th><th>GONDOLA 2</th><th>M³</th>
                <th>AGREMIADO</th><th>ESTADO</th><th>ÚLTIMO VIAJE</th><th>FOTO</th><th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map(c => {
                const activo = esActivo(c)
                const sinViaje = esSinViaje(c)
                return (
                  <tr key={c.id} className="tr" onClick={() => setDetalleCamion(c)}>
                    <td><b style={{ fontFamily: "'Space Mono',monospace", color: 'var(--acc)' }}>{c.placa_tracto}</b></td>
                    <td><Pill s={c.tipo} /></td>
                    <td style={{ fontFamily: "'Space Mono',monospace", fontSize: 10 }}>{c.placa_gondola1 || '—'}</td>
                    <td className="mono">{c.m3_gondola1 || '—'}</td>
                    <td style={{ fontFamily: "'Space Mono',monospace", fontSize: 10 }}>{c.placa_gondola2 || '—'}</td>
                    <td className="mono">{c.m3_gondola2 || '—'}</td>
                    <td style={{ fontSize: 10 }}>{getNombreAgremiado(c.agremiado_id)}</td>
                    <td>
                      {sinViaje
                        ? <span className="pill pgr">Sin viajes</span>
                        : activo
                          ? <span className="pill pg">Activo</span>
                          : <span className="pill pr">Inactivo</span>
                      }
                    </td>
                    <td style={{ fontSize: 10 }}>{c.ultimo_viaje || '—'}</td>
                    <td>
                      {c.foto_tracto_url
                        ? <a href={c.foto_tracto_url} target="_blank" className="pill pg" style={{ cursor: 'pointer', fontSize: 9 }}>✓ Ver foto</a>
                        : <span className="pill pr" style={{ fontSize: 9 }}>Sin foto</span>
                      }
                    </td>
                    <td style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {p.canConfig && <button className="btn btn-out btn-xs" onClick={() => openEdit(c)}><i className="ti ti-edit" /></button>}
                      {p.canTodo   && <button className="btn btn-danger btn-xs" onClick={() => handleDelete(c)}><i className="ti ti-trash" /></button>}
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Sin camiones con ese filtro</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalleCamion && <ModalDetalleCamion camion={detalleCamion} onClose={() => setDetalleCamion(null)} />}

      {/* Modal */}
      {showModal && (
        <Modal title={editC ? 'Editar camión' : 'Agregar camión a flotilla'} onClose={() => setShowModal(false)} lg
          footer={<>
            <button className="btn btn-out" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-acc" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </>}>
          {/* Tipo */}
          <div className="tipo-sel">
            <div className={`tipo-btn${tipo==='sencillo'?' sel':''}`} onClick={() => setTipo('sencillo')}>
              <i className="ti ti-truck" /><div style={{ fontSize: 12, fontWeight: 600 }}>Sencillo</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>1 tracto · 1 gondola</div>
            </div>
            <div className={`tipo-btn${tipo==='full'?' sel':''}`} onClick={() => setTipo('full')}>
              <i className="ti ti-truck" /><div style={{ fontSize: 12, fontWeight: 600 }}>Full</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>1 tracto · 2 gondolas</div>
            </div>
          </div>
          {/* Agremiado */}
          <div className="fg">
            <label>Agremiado</label>
            <select value={agremiadoId} onChange={e => setAgremId(e.target.value)}>
              <option value="">— Selecciona agremiado —</option>
              {agremiados.filter(a => a.activo !== false).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
          {/* Tracto */}
          <div className="fg"><label>Placa Tracto</label><input value={tracto} onChange={e => setTracto(e.target.value.toUpperCase())} placeholder="49TY4X" /></div>
          {/* Gondolas */}
          <div className="row2">
            <div className="fg"><label>Placa Gondola 1</label><input value={g1} onChange={e => setG1(e.target.value.toUpperCase())} placeholder="87UJ4L" /></div>
            <div className="fg"><label>M³ Gondola 1</label><input type="number" value={m3g1} onChange={e => setM3g1(e.target.value)} placeholder="30.00" step="0.01" /></div>
          </div>
          {tipo === 'full' && (
            <div className="row2">
              <div className="fg"><label>Placa Gondola 2</label><input value={g2} onChange={e => setG2(e.target.value.toUpperCase())} placeholder="Segunda gondola" /></div>
              <div className="fg"><label>M³ Gondola 2</label><input type="number" value={m3g2} onChange={e => setM3g2(e.target.value)} placeholder="30.00" step="0.01" /></div>
            </div>
          )}
          {/* Foto */}
          <FotoSlot label="Foto del tracto" icon="truck" onCapture={setFoto} done={!!foto || !!editC?.foto_tracto_url} />
        </Modal>
      )}
    </div>
  )
}
