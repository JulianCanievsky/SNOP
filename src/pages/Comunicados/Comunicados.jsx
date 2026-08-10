import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/apiClient.js'
import BottomNav from '../../components/BottomNav/BottomNav'
import './Comunicados.css'

// Clave en localStorage para guardar el ID del último comunicado leído
const STORAGE_KEY = 'snop_comunicado_leido'

function getUltimoLeido() {
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
}

function marcarTodosLeidos(comunicados) {
  if (!comunicados.length) return
  const maxId = Math.max(...comunicados.map(c => c.id))
  localStorage.setItem(STORAGE_KEY, String(maxId))
}

const TZ = 'America/Argentina/Buenos_Aires'

function formatFecha(fechaISO) {
  if (!fechaISO) return ''
  const d = new Date(fechaISO)
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  }).replace(/^\w/, c => c.toUpperCase())
}

export default function Comunicados() {
  const navigate = useNavigate()
  const [comunicados, setComunicados] = useState([])
  const [cargando, setCargando] = useState(true)
  const ultimoLeido = getUltimoLeido()

  useEffect(() => {
    async function fetchComunicados() {
      try {
        const { data } = await api.get('/comunicados/todos')
        const lista = data?.data ?? []
        setComunicados(lista)
        // Al abrir la pantalla marcamos todo como leído
        marcarTodosLeidos(lista)
        // Disparar evento para que Inicio actualice el badge en tiempo real
        window.dispatchEvent(new Event('comunicados-leidos'))
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    fetchComunicados()
  }, [])

  return (
    <div className="comunicados-page">
      {/* HEADER */}
      <header className="com-header">
        <button className="com-btn-back" onClick={() => navigate(-1)} aria-label="Volver">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="com-titulo">Comunicados</h1>
        <div style={{ width: 40 }} /> {/* spacer para centrar título */}
      </header>

      {/* LISTA */}
      <main className="com-lista">
        {cargando ? (
          <div className="com-empty">Cargando...</div>
        ) : comunicados.length === 0 ? (
          <div className="com-empty">
            <span className="com-empty-icon">📢</span>
            <p>Sin comunicados por ahora</p>
          </div>
        ) : (
          comunicados.map((c) => {
            const esNuevo = c.id > ultimoLeido
            return (
              <div key={c.id} className={`com-item ${esNuevo ? 'com-item--nuevo' : ''}`}>
                <div className="com-item-top">
                  <span className="com-item-titulo">{c.titulo}</span>
                  {esNuevo && <span className="com-badge-nuevo">Nuevo</span>}
                </div>
                <p className="com-item-mensaje">{c.mensaje}</p>
                <span className="com-item-fecha">{formatFecha(c.fecha)}</span>
              </div>
            )
          })
        )}
      </main>

      <BottomNav />
    </div>
  )
}
