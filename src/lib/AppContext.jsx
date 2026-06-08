import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AppContext = createContext(null)

export const ROLES = {
  admin:        { label: 'Administrador',  canTodo: true,  canRegistrar: true,  canLlegada: true,  canPagar: true,  canConciliar: true,  canConfig: true,  canVerPrecios: true  },
  contador:     { label: 'Contador',       canTodo: false, canRegistrar: false, canLlegada: false, canPagar: true,  canConciliar: true,  canConfig: false, canVerPrecios: true  },
  aux_contador: { label: 'Aux. Contador',  canTodo: false, canRegistrar: false, canLlegada: true,  canPagar: false, canConciliar: false, canConfig: false, canVerPrecios: false },
  checador:     { label: 'Checador',       canTodo: false, canRegistrar: true,  canLlegada: true,  canPagar: false, canConciliar: false, canConfig: false, canVerPrecios: false },
  supervisor:   { label: 'Supervisor',     canTodo: false, canRegistrar: false, canLlegada: false, canPagar: false, canConciliar: false, canConfig: false, canVerPrecios: false },
}

export function AppProvider({ children }) {
  const [user, setUser]                   = useState(null)
  const [loading, setLoading]             = useState(true)
  const [viajes, setViajes]               = useState([])
  const [estimaciones, setEstimaciones]   = useState([])
  const [conciliaciones, setConciliaciones] = useState([])
  const [pagos, setPagos]                 = useState([])
  const [minas, setMinas]                 = useState([])
  const [destinos, setDestinos]           = useState([])
  const [agremiados, setAgremiados]       = useState([])
  const [flotilla, setFlotilla]           = useState([])
  const [usuarios, setUsuarios]           = useState([])
  const [config, setConfig]               = useState({ tarifa_cobro: 0, tarifa_pago: 0, empresa: 'Julios Catem', obra: 'Obra Veracruz (Tehuantepec)' })

  async function login(email, password) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('password_hash', password)
      .eq('activo', true)
      .single()
    if (error || !data) throw new Error('Usuario o contraseña incorrectos')
    setUser(data)
    localStorage.setItem('catem_user', JSON.stringify(data))
    return data
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('catem_user')
  }

  const perm = () => ROLES[user?.rol] || {}

  const loadAll = useCallback(async () => {
    try {
      const [v, e, co, p, m, d, ag, fl, u, cfg] = await Promise.all([
        supabase.from('viajes').select('*').order('created_at', { ascending: false }),
        supabase.from('estimaciones').select('*').order('year', { ascending: false }),
        supabase.from('conciliaciones').select('*, conciliacion_viajes(viaje_id)').order('created_at', { ascending: false }),
        supabase.from('pagos_camionero').select('*').order('created_at', { ascending: false }),
        supabase.from('minas').select('*').order('nombre'),
        supabase.from('destinos').select('*').order('origen'),
        supabase.from('agremiados').select('*').order('nombre'),
        supabase.from('flotilla').select('*, agremiados(nombre)').order('placa_tracto'),
        supabase.from('usuarios').select('id,nombre,email,rol,sede,color,activo,created_at'),
        supabase.from('configuracion').select('*').single(),
      ])
      if (v.data)   setViajes(v.data)
      if (e.data)   setEstimaciones(e.data)
      if (co.data)  setConciliaciones(co.data)
      if (p.data)   setPagos(p.data)
      if (m.data)   setMinas(m.data)
      if (d.data)   setDestinos(d.data)
      if (ag.data)  setAgremiados(ag.data)
      if (fl.data)  setFlotilla(fl.data)
      if (u.data)   setUsuarios(u.data)
      if (cfg.data) setConfig(cfg.data)
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('catem_user')
    if (saved) try { setUser(JSON.parse(saved)) } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return
    loadAll()
    const ch = supabase.channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viajes' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flotilla' }, () => loadAll())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, loadAll])

  // Helpers
  const vM3    = v => (v.m3_1 || 0) + (v.m3_2 || 0)
  const vCobro = v => +(config.tarifa_cobro * vM3(v) * (v.km || 0)).toFixed(2)
  const vPago  = v => +(config.tarifa_pago  * vM3(v) * (v.km || 0)).toFixed(2)
  const vUtil  = v => vCobro(v) - vPago(v)
  const fmt    = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)
  const today  = () => new Date().toISOString().split('T')[0]

  // Viajes
  async function addViaje(data) {
    const { error } = await supabase.from('viajes').insert([{ ...data, registrado_por: user.id }])
    if (error) throw error
    if (data.tracto) {
      const cam = flotilla.find(f => f.placa_tracto === data.tracto)
      if (cam) await supabase.from('flotilla').update({ ultimo_viaje: data.fecha_salida, activo: true }).eq('id', cam.id)
    }
    await loadAll()
  }

  async function updateViaje(id, data) {
    const { error } = await supabase.from('viajes').update({ ...data, updated_at: new Date() }).eq('id', id)
    if (error) throw error
  }

  async function registrarLlegada(id, fecha, hora, fotoUrl) {
    await updateViaje(id, {
      fecha_llegada: fecha, hora_llegada: hora || null,
      foto_ticket_llegada: !!fotoUrl, foto_ticket_llegada_url: fotoUrl || null,
      estado: 'pendiente_conciliar',
    })
    await loadAll()
  }

  async function mandarAPago(viajeIds) {
    for (const id of viajeIds) await updateViaje(id, { estado: 'pendiente_pago' })
  }

  async function reabrirViaje(id) {
    if (!perm().canTodo) throw new Error('Solo admin puede reabrir viajes')
    await updateViaje(id, { estado: 'pendiente_conciliar' })
  }

  // Pagos
  async function registrarPago(viajeIds, datos) {
    const rows = viajeIds.map(viaje_id => ({
      viaje_id, fecha: datos.fecha,
      monto: +(datos.monto / viajeIds.length).toFixed(2),
      parte: datos.parte || 1, folio: datos.folio,
      comprobante_url: datos.comprobante_url || null,
      masivo: viajeIds.length > 1,
      folio_masivo: viajeIds.length > 1 ? datos.folio : null,
      registrado_por: user.id,
    }))
    const { error } = await supabase.from('pagos_camionero').insert(rows)
    if (error) throw error
    for (const id of viajeIds) {
      const v = viajes.find(x => x.id === id)
      // Marcar como pagado independientemente del estado de conciliación
      if (v && v.estado === 'pendiente_pago') {
        await updateViaje(id, { estado: 'cerrado', pagado: true })
      } else {
        // Adelanto o viaje ya cerrado por conciliación — solo marcar pagado
        await updateViaje(id, { pagado: true })
      }
    }
  }

  // Conciliaciones
  async function crearConciliacion(datos, viajeIds) {
    const { data: concil, error } = await supabase.from('conciliaciones').insert([{
      id: datos.id, estimacion_id: datos.estimacion_id || null,
      descripcion: datos.descripcion, fecha: datos.fecha,
      precio_total: datos.precio_total || null,
    }]).select().single()
    if (error) throw error
    await supabase.from('conciliacion_viajes').insert(viajeIds.map(viaje_id => ({ conciliacion_id: concil.id, viaje_id })))
    for (const id of viajeIds) await updateViaje(id, { estado: 'en_conciliacion' })
    return concil
  }

  async function cerrarConciliacion(id, podUrl) {
    const { error } = await supabase.from('conciliaciones').update({ estado: 'cerrada', pod_url: podUrl || null }).eq('id', id)
    if (error) throw error
    const { data: cv } = await supabase.from('conciliacion_viajes').select('viaje_id').eq('conciliacion_id', id)
    if (cv) for (const { viaje_id } of cv) await updateViaje(viaje_id, { estado: 'cerrado' })
  }

  async function quitarViajeConciliacion(concilId, viajeId) {
    await supabase.from('conciliacion_viajes').delete().eq('conciliacion_id', concilId).eq('viaje_id', viajeId)
    await updateViaje(viajeId, { estado: 'pendiente_conciliar' })
  }

  // Estimaciones
  async function addEstimacion(datos) {
    const { error } = await supabase.from('estimaciones').insert([datos])
    if (error) throw error
  }

  // Config
  async function saveConfig(datos) {
    const { error } = await supabase.from('configuracion').update(datos).eq('id', 1)
    if (error) throw error
    setConfig(prev => ({ ...prev, ...datos }))
  }

  // Usuarios
  async function addUsuario(datos) {
    const { error } = await supabase.from('usuarios').insert([datos])
    if (error) throw error
  }
  async function updateUsuario(id, datos) {
    const { error } = await supabase.from('usuarios').update(datos).eq('id', id)
    if (error) throw error
  }
  async function deleteUsuario(id) {
    const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', id)
    if (error) throw error
  }

  // Minas
  async function addMina(datos) {
    const { error } = await supabase.from('minas').insert([datos])
    if (error) throw error
  }
  async function updateMina(id, datos) {
    const { error } = await supabase.from('minas').update(datos).eq('id', id)
    if (error) throw error
  }

  // Destinos
  async function addDestino(datos) {
    const { error } = await supabase.from('destinos').insert([datos])
    if (error) throw error
  }
  async function updateDestino(id, datos) {
    const { error } = await supabase.from('destinos').update(datos).eq('id', id)
    if (error) throw error
  }
  async function deleteDestino(id) {
    const { error } = await supabase.from('destinos').update({ activo: false }).eq('id', id)
    if (error) throw error
  }

  // Agremiados
  async function addAgremiado(datos) {
    const { error } = await supabase.from('agremiados').insert([datos])
    if (error) throw error
  }
  async function updateAgremiado(id, datos) {
    const { error } = await supabase.from('agremiados').update(datos).eq('id', id)
    if (error) throw error
  }
  async function deleteAgremiado(id) {
    const { error } = await supabase.from('agremiados').update({ activo: false }).eq('id', id)
    if (error) throw error
  }

  // Flotilla
  async function addCamion(datos) {
    const { error } = await supabase.from('flotilla').insert([datos])
    if (error) throw error
  }
  async function updateCamion(id, datos) {
    const { error } = await supabase.from('flotilla').update({ ...datos, updated_at: new Date() }).eq('id', id)
    if (error) throw error
  }
  async function deleteCamion(id) {
    const { error } = await supabase.from('flotilla').update({ activo: false }).eq('id', id)
    if (error) throw error
  }

  // Fotos
  async function uploadFoto(file, path) {
    const ext = file.name.split('.').pop()
    const fileName = `${path}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from('fotos').getPublicUrl(fileName)
    return data.publicUrl
  }

  return (
    <AppContext.Provider value={{
      user, login, logout, perm, loading,
      viajes, estimaciones, conciliaciones, pagos, minas, destinos,
      agremiados, flotilla, usuarios, config,
      loadAll,
      vM3, vCobro, vPago, vUtil, fmt, today,
      addViaje, updateViaje, registrarLlegada, mandarAPago, reabrirViaje,
      registrarPago,
      crearConciliacion, cerrarConciliacion, quitarViajeConciliacion,
      addEstimacion,
      saveConfig,
      addUsuario, updateUsuario, deleteUsuario,
      addMina, updateMina,
      addDestino, updateDestino, deleteDestino,
      addAgremiado, updateAgremiado, deleteAgremiado,
      addCamion, updateCamion, deleteCamion,
      uploadFoto,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
