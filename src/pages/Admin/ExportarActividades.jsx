import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminBottomNav from '../../components/AdminBottomNav/AdminBottomNav'
import { getSedes, exportarExcel } from '../../services/adminApi'
import './Admin.css'

const TIPOS = [
  { key: 'turnos',      label: 'Turnos de entrenamiento', emoji: '🏓' },
  { key: 'juego-libre', label: 'Juego libre',              emoji: '🎯' },
  { key: 'torneos',     label: 'Torneos internos',         emoji: '🏆' },
]

// Genera yyyy-mm-dd del primer y último día del mes en curso
function rangoMesActual() {
  const hoy   = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  const fmt   = (d) => d.toISOString().slice(0, 10)
  return { desde: fmt(desde), hasta: fmt(hasta) }
}

export default function ExportarActividades() {
  const navigate = useNavigate()
  const { desde: defaultDesde, hasta: defaultHasta } = rangoMesActual()

  const [sedes,      setSedes]      = useState([])
  const [tipo,       setTipo]       = useState('turnos')
  const [desde,      setDesde]      = useState(defaultDesde)
  const [hasta,      setHasta]      = useState(defaultHasta)
  const [sedeId,     setSedeId]     = useState('')
  const [descargando, setDescargando] = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    getSedes().then(setSedes).catch(() => setSedes([]))
  }, [])

  async function handleDescargar() {
    if (!desde || !hasta) {
      setError('Seleccioná un rango de fechas')
      return
    }
    if (new Date(desde) > new Date(hasta)) {
      setError('La fecha de inicio debe ser anterior a la de fin')
      return
    }
    setError('')
    setDescargando(true)
    try {
      const blob = await exportarExcel(tipo, { desde, hasta, sede_id: sedeId || undefined })

      // Disparar descarga en el browser
      const url      = URL.createObjectURL(blob)
      const tipoInfo = TIPOS.find(t => t.key === tipo)
      const nombre   = tipoInfo?.label.toLowerCase().replace(/ /g, '_') ?? tipo
      const link     = document.createElement('a')
      link.href      = url
      link.download  = `snop_${nombre}_${desde}_${hasta}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setError('Error al generar el archivo. Intentá de nuevo.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn-volver-admin" onClick={() => navigate('/admin')}>‹ Inicio</button>
        <h1>Exportar actividades</h1>
        <p>Descargar listados en Excel</p>
      </div>

      <div className="admin-body">
        {error && <div className="alerta-error">{error}</div>}

        {/* Selector de tipo */}
        <div>
          <p className="admin-label">Qué exportar</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIPOS.map(t => (
              <button
                key={t.key}
                className={`radio-option${tipo === t.key ? ' sel' : ''}`}
                onClick={() => setTipo(t.key)}
              >
                <span style={{ fontSize: 18 }}>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="admin-card admin-card-body">
          <p className="admin-label" style={{ marginBottom: 12 }}>Filtros</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div className="form-group">
              <label>Desde</label>
              <input
                type="date"
                className="form-input"
                value={desde}
                onChange={e => setDesde(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Hasta</label>
              <input
                type="date"
                className="form-input"
                value={hasta}
                onChange={e => setHasta(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Sede (opcional)</label>
            <select
              className="form-select"
              value={sedeId}
              onChange={e => setSedeId(e.target.value)}
            >
              <option value="">Todas las sedes</option>
              {sedes.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info formato */}
        <div style={{
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          borderRadius: 10,
          padding: '12px 14px',
          fontSize: 13,
          color: '#4338ca',
          lineHeight: 1.5,
        }}>
          📋 El archivo descargado tiene <strong>una fila por socio por evento</strong>,
          lo que permite filtrar y ordenar fácilmente en Excel. Los eventos sin inscriptos
          también aparecen con una fila indicando «sin inscriptos».
        </div>

        <button
          className="btn-primary"
          onClick={handleDescargar}
          disabled={descargando}
          style={{ marginTop: 4 }}
        >
          {descargando ? 'Generando archivo...' : '⬇ Descargar Excel'}
        </button>
      </div>

      <AdminBottomNav />
    </div>
  )
}
