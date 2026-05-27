import { useState } from 'react'
import { useApp } from '../lib/AppContext'
import Pill from '../components/Pill'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

// ══ PAGOS ══
export function ViewPagos() {
  const { pagos, viajes, fmt } = useApp()
  return (
    <div>
      <div className="tc">
        <div className="tc-h"><span className="tc-t">Registro de pagos a camioneros</span></div>
        <div className="tw">
          <table>
            <thead><tr><th>FECHA</th><th>BOLETA(S)</th><th>OPERADOR</th><th>TIPO</th><th>MONTO</th><th>FOLIO</th><th>COMPROBANTE</th></tr></thead>
            <tbody>
              {pagos.length ? pagos.map(p => {
                const v = viajes.find(x => x.id === p.viaje_id)
                return (
                  <tr key={p.id}>
                    <td>{p.fecha}</td>
                    <td className="mono" style={{ color: 'var(--acc)' }}>{p.viaje_id}</td>
                    <td style={{ fontSize: 10 }}>{v?.operador || '—'}</td>
                    <td>{p.masivo ? <span className="pill pp">Masivo</span> : `Parte ${p.parte}`}</td>
                    <td className="mono" style={{ color: 'var(--pago)' }}>{fmt(p.monto)}</td>
                    <td style={{ fontSize: 10, color: 'var(--muted)' }}>{p.folio || '—'}</td>
                    <td>{p.comprobante_url ? <a href={p.comprobante_url} target="_blank" className="pill pg" style={{ cursor: 'pointer' }}>✓ Ver</a> : <span className="pill pr">Sin archivo</span>}</td>
                  </tr>
                )
              }) : <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Sin pagos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══ REPORTES ══
export function ViewReportes() {
  const { viajes, vM3 } = useApp()
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [texto, setTexto] = useState('')

  function generar() {
    const vs = viajes.filter(v => v.fecha_salida === fecha)
    if (!vs.length) { setTexto('Sin viajes para el ' + fecha); return }
    const sen = vs.filter(v => v.tipo === 'sencillo')
    const ful = vs.filter(v => v.tipo === 'full')
    const m3Sen = sen.reduce((a, v) => a + vM3(v), 0)
    const m3Ful = ful.reduce((a, v) => a + vM3(v), 0)
    const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const [y,m,d] = fecha.split('-')
    const fStr = `${d} ${meses[parseInt(m)]} ${y}`
    const t = [
      '🚛 *REPORTE DE VIAJES*',
      `📅 *${fStr}*`,
      '',
      '*SENCILLOS*',
      `• Unidades: *${sen.length}*`,
      `• M³: *${m3Sen.toFixed(2)}*`,
      '',
      '*FULL*',
      `• Unidades: *${ful.length}*`,
      `• M³: *${m3Ful.toFixed(2)}*`,
      '',
      '─────────────────',
      '*TOTAL*',
      `• Viajes: *${vs.length}*`,
      `• M³: *${(m3Sen + m3Ful).toFixed(2)}*`,
    ].join('\n')
    setTexto(t)
  }

  function enviarWA() {
    if (!texto) return
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank')
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    alert('✓ Copiado')
  }

  return (
    <div>
      <div style={{ background: 'var(--bg2)', border: '2px solid rgba(34,197,94,.3)', borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(34,197,94,.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-brand-whatsapp" style={{ fontSize: 22, color: 'var(--ok)' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Reporte diario de viajes</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Sin precios · Sin nombres · Para el grupo de jefes</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="fg" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label>Fecha del reporte</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ background: 'var(--bg3)' }} />
          </div>
          <button className="btn btn-out btn-sm" onClick={() => { setFecha(new Date().toISOString().split('T')[0]); setTimeout(generar, 50) }}>
            <i className="ti ti-calendar-today" />Hoy
          </button>
          <button className="btn btn-out btn-sm" onClick={generar}><i className="ti ti-refresh" />Generar</button>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, fontFamily: "'Space Mono',monospace", fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 14, minHeight: 80, color: 'var(--text)' }}>
          {texto || 'Selecciona una fecha y presiona Generar'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ok" style={{ flex: 1, justifyContent: 'center', padding: 12 }} onClick={enviarWA}>
            <i className="ti ti-brand-whatsapp" style={{ fontSize: 16 }} />Abrir en WhatsApp
          </button>
          <button className="btn btn-out btn-sm" onClick={copiar}><i className="ti ti-copy" />Copiar</button>
        </div>
      </div>
    </div>
  )
}

// ══ CONFIG ══
export function ViewConfig() {
  const { config, saveConfig, minas, addMina, updateMina } = useApp()
  const toast = useToast()
  const [cobro, setCobro] = useState(config.tarifa_cobro || '')
  const [pago, setPago]   = useState(config.tarifa_pago || '')
  const [emp, setEmp]     = useState(config.empresa || '')
  const [obra, setObra]   = useState(config.obra || '')
  const [nuevaMina, setNM] = useState('')
  const [nuevaKm, setNK]  = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSaveTarifas() {
    setSaving(true)
    try {
      await saveConfig({ tarifa_cobro: parseFloat(cobro)||0, tarifa_pago: parseFloat(pago)||0 })
      toast('Tarifas guardadas ✓', 'ok')
    } catch (err) { toast(err.message, 'err') }
    setSaving(false)
  }

  async function handleSaveEmpresa() {
    try {
      await saveConfig({ empresa: emp, obra })
      toast('Empresa guardada ✓', 'ok')
    } catch (err) { toast(err.message, 'err') }
  }

  async function handleAddMina() {
    if (!nuevaMina.trim()) return
    try {
      await addMina({ nombre: nuevaMina.trim().toUpperCase(), km_default: parseFloat(nuevaKm)||0 })
      setNM(''); setNK('')
      toast('Mina agregada', 'ok')
    } catch (err) { toast(err.message, 'err') }
  }

  const sim = { m3_1: 30, m3_2: 0, km: 384 }
  const simCob = +((parseFloat(cobro)||0) * 30 * 384).toFixed(2)
  const simPag = +((parseFloat(pago)||0)  * 30 * 384).toFixed(2)
  const simUtil = simCob - simPag

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
      {/* TARIFAS */}
      <div className="tc" style={{ padding: 15 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-calculator" style={{ color: 'var(--acc)' }} />Tarifas de cálculo
        </div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, padding: 13, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cobro)', marginBottom: 8 }}>↗ TARIFA COBRO AL CLIENTE</div>
          <div className="fg"><label>$ por m³ por km</label><input type="number" value={cobro} onChange={e => setCobro(e.target.value)} placeholder="0.00" step="0.01" /></div>
        </div>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 9, padding: 13, marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--pago)', marginBottom: 8 }}>↙ TARIFA PAGO AL CAMIONERO</div>
          <div className="fg"><label>$ por m³ por km</label><input type="number" value={pago} onChange={e => setPago(e.target.value)} placeholder="0.00" step="0.01" /></div>
        </div>
        <div className="cbox">
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginBottom: 7 }}>SIMULACIÓN (30 m³ × 384 km)</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>Cobro:</span><span className="mono" style={{ color: 'var(--cobro)' }}>${simCob.toLocaleString('es-MX')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>Pago:</span><span className="mono" style={{ color: 'var(--pago)' }}>${simPag.toLocaleString('es-MX')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0 2px', borderTop: '1px solid var(--border)', marginTop: 4 }}><b>Utilidad:</b><span className="mono" style={{ color: 'var(--util)', fontWeight: 700 }}>${simUtil.toLocaleString('es-MX')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>↳ CATEM (50%):</span><span className="mono" style={{ color: 'var(--util)' }}>${(simUtil/2).toLocaleString('es-MX')}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>↳ JSV (50%):</span><span className="mono" style={{ color: 'var(--util)' }}>${(simUtil/2).toLocaleString('es-MX')}</span></div>
        </div>
        <button className="btn btn-acc" style={{ width: '100%', marginTop: 11, justifyContent: 'center' }} onClick={handleSaveTarifas} disabled={saving}>
          <i className="ti ti-device-floppy" />{saving ? 'Guardando...' : 'Guardar tarifas'}
        </button>
      </div>

      <div>
        {/* EMPRESA */}
        <div className="tc" style={{ padding: 15, marginBottom: 11 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-building" style={{ color: 'var(--acc)' }} />Empresa
          </div>
          <div className="fg"><label>Nombre empresa</label><input value={emp} onChange={e => setEmp(e.target.value)} /></div>
          <div className="fg"><label>Obra / Proyecto activo</label><input value={obra} onChange={e => setObra(e.target.value)} /></div>
          <button className="btn btn-acc" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSaveEmpresa}>
            <i className="ti ti-device-floppy" />Guardar
          </button>
        </div>

        {/* MINAS */}
        <div className="tc" style={{ padding: 15 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-map-pin" style={{ color: 'var(--acc)' }} />Minas / Destinos
          </div>
          {minas.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
              <span style={{ flex: 1 }}>{m.nombre}</span>
              <input type="number" defaultValue={m.km_default} placeholder="KM"
                style={{ width: 70, padding: '3px 6px', fontSize: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text)' }}
                onBlur={e => updateMina(m.id, { km_default: parseFloat(e.target.value)||0 })} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>km</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
            <input value={nuevaMina} onChange={e => setNM(e.target.value)} placeholder="Nombre de la mina..." style={{ flex: 1 }} />
            <input type="number" value={nuevaKm} onChange={e => setNK(e.target.value)} placeholder="KM" style={{ width: 70 }} />
            <button className="btn btn-out btn-sm" onClick={handleAddMina}><i className="ti ti-plus" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ══ USUARIOS ══
export function ViewUsuarios() {
  const { usuarios, addUsuario, updateUsuario, deleteUsuario, perm } = useApp()
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editU, setEditU]         = useState(null)
  const [nombre, setNom]          = useState('')
  const [email, setEmail]         = useState('')
  const [pass, setPass]           = useState('')
  const [sede, setSede]           = useState('CDMX')
  const [rol, setRol]             = useState('checador')
  const [showPass, setShowPass]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const p = perm()
  const COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#A78BFA','#0891B2']
  const ROLES_LABELS = { admin: 'Administrador', contador: 'Contador', aux_contador: 'Aux. Contador', checador: 'Checador', supervisor: 'Supervisor' }

  function openNew() {
    setEditU(null); setNom(''); setEmail(''); setPass(''); setSede('CDMX'); setRol('checador'); setShowPass(false); setShowModal(true)
  }
  function openEdit(u) {
    setEditU(u); setNom(u.nombre); setEmail(u.email); setPass(u.password_hash||''); setSede(u.sede||'CDMX'); setRol(u.rol); setShowPass(false); setShowModal(true)
  }

  async function handleSave() {
    if (!nombre || !email) return toast('Nombre y correo requeridos', 'err')
    if (!pass || pass.length < 4) return toast('Contraseña mínimo 4 caracteres', 'err')
    const dup = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== editU?.id)
    if (dup) return toast('Ya existe un usuario con ese correo', 'err')
    setSaving(true)
    try {
      if (editU) {
        await updateUsuario(editU.id, { nombre, email: email.toLowerCase(), password_hash: pass, sede, rol })
        toast('Usuario actualizado ✓', 'ok')
      } else {
        await addUsuario({ nombre, email: email.toLowerCase(), password_hash: pass, sede, rol, color: COLORS[usuarios.length % 6] })
        toast('Usuario creado · Ya puede iniciar sesión', 'ok')
      }
      setShowModal(false)
    } catch (err) { toast(err.message, 'err') }
    setSaving(false)
  }

  async function handleDelete(u) {
    if (!window.confirm(`¿Eliminar a ${u.nombre}? No podrá iniciar sesión.`)) return
    try {
      await deleteUsuario(u.id)
      toast('Usuario desactivado', 'ok')
    } catch (err) { toast(err.message, 'err') }
  }

  const ini = n => n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()

  if (!p.canTodo) return (
    <div className="empty"><i className="ti ti-lock" /><p>Solo el administrador puede gestionar usuarios</p></div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Solo los usuarios registrados aquí pueden acceder al sistema</div>
        <button className="btn btn-acc btn-sm" onClick={openNew}><i className="ti ti-plus" />Nuevo usuario</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10 }}>
        {usuarios.filter(u => u.activo !== false).map(u => (
          <div key={u.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: u.color||COLORS[0], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{ini(u.nombre)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
              <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 2, fontFamily: "'Space Mono',monospace" }}>
                {'•'.repeat(Math.min(u.password_hash?.length||0, 8))}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <span className="pill pa">{ROLES_LABELS[u.rol]||u.rol}</span>
                <span className="pill pgr">{u.sede}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
              <button className="btn btn-out btn-xs" onClick={() => openEdit(u)}><i className="ti ti-edit" />Editar</button>
              {u.email !== 'admin@catem.mx' && (
                <button className="btn btn-danger btn-xs" onClick={() => handleDelete(u)}><i className="ti ti-trash" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editU ? 'Editar usuario' : 'Nuevo usuario'} onClose={() => setShowModal(false)}
          footer={<><button className="btn btn-out" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-acc" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
          <div className="fg"><label>Nombre completo</label><input value={nombre} onChange={e => setNom(e.target.value)} placeholder="Juan Pérez" /></div>
          <div className="fg"><label>Correo / Usuario</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@catem.mx" /></div>
          <div className="fg">
            <label>Contraseña</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type={showPass ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} placeholder="Mínimo 4 caracteres" style={{ flex: 1 }} />
              <button type="button" className="btn btn-out" style={{ padding: '0 10px', flexShrink: 0 }} onClick={() => setShowPass(!showPass)}>
                <i className={`ti ti-eye${showPass ? '-off' : ''}`} style={{ fontSize: 15 }} />
              </button>
            </div>
          </div>
          <div className="row2">
            <div className="fg"><label>Sede</label><select value={sede} onChange={e => setSede(e.target.value)}><option>CDMX</option><option>Tabasco</option><option>Veracruz</option><option>Monterrey</option><option>Campo</option></select></div>
            <div className="fg"><label>Rol</label><select value={rol} onChange={e => setRol(e.target.value)}><option value="admin">Administrador</option><option value="contador">Contador</option><option value="aux_contador">Aux. Contador</option><option value="checador">Checador</option><option value="supervisor">Supervisor</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ViewPagos
