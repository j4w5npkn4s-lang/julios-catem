import { useState, useEffect } from 'react'
import { useApp } from '../lib/AppContext'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { login } = useApp()
  const toast = useToast()
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [empresa, setEmpresa] = useState('JULIOS CATEM')
  const [obra, setObra]       = useState('Obra Veracruz (Tehuantepec)')

  useEffect(() => {
    // Cargar config silenciosamente — si falla no importa
    supabase.from('configuracion').select('logo_url,empresa,obra').single()
      .then(({ data }) => {
        if (data) {
          if (data.logo_url) setLogoUrl(data.logo_url)
          if (data.empresa)  setEmpresa(data.empresa)
          if (data.obra)     setObra(data.obra)
        }
      })
      .catch(() => {}) // silencioso
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !pass) return toast('Ingresa correo y contraseña', 'warn')
    setLoading(true)
    try {
      await login(email, pass)
    } catch (err) {
      toast(err.message || 'Usuario o contraseña incorrectos', 'err')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, width: 380, maxWidth: '100%' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: logoUrl ? 'transparent' : 'var(--acc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#000', fontFamily: "'Space Mono', monospace", flexShrink: 0, overflow: 'hidden' }}>
            {logoUrl
              ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoUrl(null)} />
              : 'JC'
            }
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700 }}>{empresa}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{obra}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 28, paddingLeft: 60 }}>
          Sistema de gestión logística
        </div>

        <form onSubmit={handleLogin}>
          <div className="fg">
            <label>Correo / Usuario</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="correo@catem.mx" autoComplete="username" required
            />
          </div>
          <div className="fg">
            <label>Contraseña</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type={show ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-out" style={{ padding: '0 10px', flexShrink: 0 }} onClick={() => setShow(!show)}>
                <i className={`ti ti-eye${show ? '-off' : ''}`} style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 16, textAlign: 'center' }}>
            Acceso solo para usuarios autorizados
          </div>
          <button type="submit" className="btn btn-pri" disabled={loading}>
            {loading ? 'Verificando...' : 'Entrar al sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}
