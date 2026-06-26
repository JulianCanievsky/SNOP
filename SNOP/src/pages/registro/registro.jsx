import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './registro.css'

export default function Registro() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const { nombre, email, password, confirmPassword } = form

    if (!nombre.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Completá todos los campos')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { nombre: nombre.trim() },
        },
      })

      if (signUpError) {
        if (
          signUpError.message.includes('already registered') ||
          signUpError.message.includes('User already registered')
        ) {
          throw new Error('Ya existe una cuenta con ese correo electrónico')
        }
        throw new Error(signUpError.message)
      }

      // Insertar el usuario en public.users manualmente
      const authUser = signUpData?.user
      if (authUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            auth_id: authUser.id,           // UUID de Supabase Auth
            nombre: nombre.trim(),
            email: email.trim().toLowerCase(),
            password: '—',                  // placeholder: la auth real la maneja Supabase Auth
            tipo_usuario_id: 1,             // socio por defecto
            activo: true,
            cuota_al_dia: true,
            fecha_alta: new Date().toISOString(),
          })

        if (insertError && insertError.code !== '23505' && insertError.status !== 409) {
          console.error('Error al crear perfil:', insertError.message)
          throw new Error('Cuenta creada pero hubo un error al guardar el perfil. Contactá al administrador.')
        }
      }

      setSuccess('¡Cuenta creada! El entrenador te asignará tu nivel. Ya podés iniciar sesión.')
      setForm({ nombre: '', email: '', password: '', confirmPassword: '' })
      // Cerrar la sesión que Supabase abre automáticamente al registrar
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login'), 2500)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // JSX sin cambios — se mantiene igual que el original
  return (
    <div className="registro-container">
      <div className="registro-header">
        <button className="btn-volver" onClick={() => navigate('/')}>
          ‹ volver
        </button>
      </div>

      <div className="registro-hero">
        <h2>Crear cuenta</h2>
        <p>Tu nivel será asignado por el entrenador</p>
      </div>

      <div className="registro-card">
        <form onSubmit={handleSubmit}>
          {error   && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <div className="form-group">
            <label htmlFor="nombre">Nombre completo</label>
            <input id="nombre" name="nombre" type="text" className="form-input"
              placeholder="Nombre y apellido" value={form.nombre}
              onChange={handleChange} autoComplete="name" />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" type="email" className="form-input"
              placeholder="tu@email.com" value={form.email}
              onChange={handleChange} autoComplete="email" />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" className="form-input"
              placeholder="••••••••" value={form.password}
              onChange={handleChange} autoComplete="new-password" />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input id="confirmPassword" name="confirmPassword" type="password" className="form-input"
              placeholder="••••••••" value={form.confirmPassword}
              onChange={handleChange} autoComplete="new-password" />
          </div>

          <div className="info-box">
            El entrenador asigna el entrenador luego de tu clase de prueba
          </div>

          <button type="submit" className="btn-registro" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}