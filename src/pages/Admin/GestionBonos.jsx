/**
 * GestionBonos.jsx
 * Panel de administración de bonos.
 * Acceso: /admin/socios/:id/bonos (desde DetalleSocio) o /admin/bonos/:socioId
 */
import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSocio }                          from '../../services/adminApi'
import { crearBono, getBonosSocio, desactivarBono } from '../../services/bonosApi'
import './Admin.css'

const TZ = 'America/Argentina/Buenos_Aires'

const TIPO_LABEL = {
  mensual:       'Mensual',
  trimestral:    'Trimestral',
  personalizado: 'Personalizado',
}

const TIPO_COLOR = {
  mensual:       { bg: '#eff6ff', color: '#2563eb' },
  trimestral:    { bg: '#f0fdf4', color: '#16a34a' },
  personalizado: { bg: '#fdf4ff', color: '#7c3aed' },
}

function formatFecha(iso) {
  if (!iso) return '—'
  // iso puede ser YYYY-MM-DD (date) o ISO completo
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ })
}

// Barra de progreso de créditos
function BarraCreditos({ usados, total }) {
  const pct     = total > 0 ? Math.min((usados / total) * 100, 100) : 0
  const restantes = total - usados
  const agotado   = restantes <= 0
  const porAgotar = !agotado && restantes <= 2

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--admin-muted)' }}>{usados} usados</span>
        <span style={{
          fontWeight: 700,
          color: agotado ? '#dc2626' : porAgotar ? '#d97706' : '#16a34a',
        }}>
          {restantes} disponible{restantes !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 999, transition: 'width .3s',
          background: agotado ? '#dc2626' : porAgotar ? '#f59e0b' : '#2563eb',
        }} />
      </div>
    </div>
  )
}

// Tarjeta de un bono individual
function TarjetaBono({ bono, onDesactivar, desactivando }) {
  const [expandido, setExpandido] = useState(false)
  const tc = TIPO_COLOR[bono.tipo] ?? { bg: '#f3f4f6', color: '#6b7280' }
  const hoy = new Date().toISOString().split('T')[0]
  const vencido  = bono.fecha_vencimiento < hoy
  const agotado  = bono.creditos_disponibles <= 0
  const inactivo = !bono.activo || vencido || agotado

  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      border: `1.5px solid ${inactivo ? '#e5e7eb' : '#dbeafe'}`,
      padding: '14px 16px',
      opacity: inactivo ? 0.7 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px',
              borderRadius: 999, background: tc.bg, color: tc.color,
            }}>
              {TIPO_LABEL[bono.tipo] ?? bono.tipo}
            </span>
            {vencido && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c' }}>
                Vencido
              </span>
            )}
            {agotado && !vencido && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#fef3c7', color: '#92400e' }}>
                Sin créditos
              </span>
            )}
            {!bono.activo && !vencido && !agotado && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#f3f4f6', color: '#6b7280' }}>
                Desactivado
              </span>
            )}
            {bono.vigente && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#dcfce7', color: '#16a34a' }}>
                ✓ Vigente
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--admin-text)' }}>
            {bono.creditos_total} crédito{bono.creditos_total !== 1 ? 's' : ''} · {formatFecha(bono.fecha_inicio)} — {formatFecha(bono.fecha_vencimiento)}
          </p>
          {bono.notas && (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--admin-muted)' }}>{bono.notas}</p>
          )}
        </div>

        {bono.activo && !vencido && (
          <button
            className="btn-danger"
            style={{ padding: '5px 10px', fontSize: 11, flexShrink: 0 }}
            onClick={() => onDesactivar(bono.id)}
            disabled={desactivando === bono.id}
          >
            {desactivando === bono.id ? '...' : 'Desactivar'}
          </button>
        )}
      </div>

      {/* Barra de créditos */}
      <BarraCreditos usados={bono.creditos_usados} total={bono.creditos_total} />

      {/* Expandir usos */}
      {bono.usos?.length > 0 && (
        <button
          style={{ marginTop: 8, fontSize: 12, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          onClick={() => setExpandido(e => !e)}
        >
          {expandido ? '▲ Ocultar usos' : `▼ Ver ${bono.usos.length} uso${bono.usos.length !== 1 ? 's' : ''}`}
        </button>
      )}

      {expandido && bono.usos?.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid #f1f5f9', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {bono.usos.map(u => (
            <div key={u.id} style={{ fontSize: 12, color: 'var(--admin-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>📅 {formatFecha(u.turnos?.fecha_inicio)} — {u.turnos?.sedes?.nombre ?? '—'}</span>
              <span style={{ color: '#9ca3af' }}>{new Date(u.fecha_uso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: TZ })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function GestionBonos() {
  const { socioId } = useParams()
  const navigate    = useNavigate()

  const [socio,       setSocio]       = useState(null)
  const [bonos,       setBonos]       = useState([])
  const [cargando,    setCargando]    = useState(true)
  const [enviando,    setEnviando]    = useState(false)
  const [desactivando, setDesactivando] = useState(null)
  const [exito,       setExito]       = useState('')
  const [error,       setError]       = useState('')

  const hoy = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    tipo:              'mensual',
    creditos_total:    8,
    fecha_inicio:      hoy,
    fecha_vencimiento: '',
    notas:             '',
  })

  // Calcular fecha de vencimiento automática según tipo
  function calcularVencimiento(tipo, desde) {
    if (!desde) return ''
    const d = new Date(`${desde}T12:00:00`)
    if (tipo === 'mensual')    d.setMonth(d.getMonth() + 1)
    if (tipo === 'trimestral') d.setMonth(d.getMonth() + 3)
    if (tipo === 'personalizado') return ''
    return d.toISOString().split('T')[0]
  }

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [{ usuario }, bonosData] = await Promise.all([
        getSocio(socioId),
        getBonosSocio(socioId),
      ])
      setSocio(usuario)
      setBonos(bonosData ?? [])
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos')
    } finally {
      setCargando(false)
    }
  }, [socioId])

  useEffect(() => { cargar() }, [cargar])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: name === 'creditos_total' ? Number(value) : value }
      // Recalcular vencimiento automáticamente cuando cambia tipo o fecha_inicio
      if (name === 'tipo' || name === 'fecha_inicio') {
        const venc = calcularVencimiento(
          name === 'tipo' ? value : prev.tipo,
          name === 'fecha_inicio' ? value : prev.fecha_inicio,
        )
        if (venc) next.fecha_vencimiento = venc
      }
      return next
    })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.fecha_inicio || !form.fecha_vencimiento) {
      setError('Completá las fechas de inicio y vencimiento')
      return
    }
    if (form.fecha_vencimiento < form.fecha_inicio) {
      setError('La fecha de vencimiento debe ser posterior al inicio')
      return
    }
    setEnviando(true)
    try {
      const nuevo = await crearBono({ ...form, socio_id: socioId })
      setExito(`Bono creado: ${nuevo.data.creditos_total} créditos`)
      setTimeout(() => setExito(''), 4000)
      await cargar()
      setForm(prev => ({ ...prev, notas: '' }))
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear bono')
    } finally {
      setEnviando(false)
    }
  }

  async function handleDesactivar(bonoId) {
    if (!window.confirm('¿Desactivar este bono?')) return
    setDesactivando(bonoId)
    try {
      await desactivarBono(bonoId)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al desactivar bono')
    } finally {
      setDesactivando(null)
    }
  }

  const bonosVigentes  = bonos.filter(b => b.vigente)
  const bonosHistorial = bonos.filter(b => !b.vigente)

  if (cargando) {
    return (
      <div className="admin-page">
        <div className="admin-header">
          <button className="btn-volver-admin" onClick={() => navigate(-1)}>‹ Volver</button>
          <h1>Bonos</h1>
        </div>
        <div className="admin-body">
          <div className="estado-carga"><div className="spinner-admin" /></div>
        </div>
        <AdminBottomNav />
      </div>
    )
  }

  const iniciales = socio?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate(-1)}>‹ Volver</button>
        <h1>Bonos</h1>
        <p>Gestión de créditos de {socio?.nombre ?? 'socio'}</p>
      </div>

      <div className="admin-body">
        {/* Perfil mini */}
        <div className="admin-card admin-card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="config-avatar" style={{ width: 44, height: 44, fontSize: 16, flexShrink: 0 }}>{iniciales}</div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--admin-text)' }}>{socio?.nombre}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--admin-muted)' }}>{socio?.email}</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: bonosVigentes.length ? '#2563eb' : 'var(--admin-muted)' }}>
              {bonosVigentes.reduce((s, b) => s + b.creditos_disponibles, 0)}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--admin-muted)' }}>créditos activos</p>
          </div>
        </div>

        {exito && <div className="alerta-exito">✓ {exito}</div>}
        {error && <div className="alerta-error">{error}</div>}

        {/* ── Crear bono ── */}
        <div className="admin-card admin-card-body">
          <p className="admin-label" style={{ marginBottom: 12 }}>Nuevo bono</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Tipo */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 6, display: 'block' }}>Tipo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['mensual', 'trimestral', 'personalizado'].map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`filtro-pill${form.tipo === t ? ' activo' : ''}`}
                    style={{ flex: 1, fontSize: 12 }}
                    onClick={() => handleChange({ target: { name: 'tipo', value: t } })}
                  >
                    {TIPO_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Créditos */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 6, display: 'block' }}>
                Cantidad de créditos (clases)
              </label>
              <input
                name="creditos_total"
                type="number"
                min="1"
                max="200"
                className="form-input"
                value={form.creditos_total}
                onChange={handleChange}
              />
            </div>

            {/* Fechas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 6, display: 'block' }}>Inicio</label>
                <input
                  name="fecha_inicio"
                  type="date"
                  className="form-input"
                  value={form.fecha_inicio}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 6, display: 'block' }}>Vencimiento</label>
                <input
                  name="fecha_vencimiento"
                  type="date"
                  className="form-input"
                  value={form.fecha_vencimiento}
                  onChange={handleChange}
                  min={form.fecha_inicio}
                />
              </div>
            </div>

            {/* Notas */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, color: 'var(--admin-muted)', marginBottom: 6, display: 'block' }}>Notas (opcional)</label>
              <input
                name="notas"
                type="text"
                className="form-input"
                placeholder="ej. Plan verano, pago en efectivo..."
                value={form.notas}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={enviando}>
              {enviando ? 'Creando...' : 'Crear bono'}
            </button>
          </form>
        </div>

        {/* ── Bonos vigentes ── */}
        {bonos.length > 0 && (
          <>
            <p className="admin-label">Bonos activos</p>
            {bonosVigentes.length === 0 ? (
              <div className="estado-vacio" style={{ fontSize: 13 }}>Sin bonos vigentes.</div>
            ) : (
              bonosVigentes.map(b => (
                <TarjetaBono
                  key={b.id}
                  bono={b}
                  onDesactivar={handleDesactivar}
                  desactivando={desactivando}
                />
              ))
            )}

            {/* ── Historial ── */}
            {bonosHistorial.length > 0 && (
              <>
                <p className="admin-label" style={{ marginTop: 8 }}>Historial</p>
                {bonosHistorial.map(b => (
                  <TarjetaBono
                    key={b.id}
                    bono={b}
                    onDesactivar={handleDesactivar}
                    desactivando={desactivando}
                  />
                ))}
              </>
            )}
          </>
        )}

        {!cargando && bonos.length === 0 && (
          <div className="estado-vacio">Este socio no tiene bonos todavía.</div>
        )}
      </div>

      <AdminBottomNav />
    </div>
  )
}
