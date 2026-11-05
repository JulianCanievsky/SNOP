import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Spinner from './components/ui/Spinner/Spinner'

// Splash y Login van en el bundle inicial; el resto se carga al entrar a cada pantalla.

import Splash             from './pages/Splash/Splash'
import Login              from './pages/login/login'
const Registro = lazy(() => import('./pages/registro/registro'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword/ResetPassword'))
const Inicio = lazy(() => import('./pages/Inicio/Inicio'))
const MisTurnos = lazy(() => import('./pages/MisTurnos/MisTurnos'))
const JuegoLibre = lazy(() => import('./pages/JuegoLibre/JuegoLibre'))
const ClasesParticulares = lazy(() => import('./pages/ClasesParticulares/ClasesParticulares'))
const Perfil = lazy(() => import('./pages/Perfil/Perfil'))
const Comunicados = lazy(() => import('./pages/Comunicados/Comunicados'))
const MisClases = lazy(() => import('./pages/MisClases/MisClases'))
const Torneos = lazy(() => import('./pages/Torneos/Torneos'))
const Notificaciones = lazy(() => import('./pages/Notificaciones/Notificaciones'))
const Entrenamientos = lazy(() => import('./pages/Entrenamientos/Entrenamientos'))

// Dev-only — página de showcase del sistema de diseño (no se linkea en la nav)
const DesignSystem = lazy(() => import('./pages/DesignSystem/DesignSystem'))

// Admin
const AdminInicio = lazy(() => import('./pages/Admin/AdminInicio'))
const GestionSocios = lazy(() => import('./pages/Admin/GestionSocios'))
const DetalleSocio = lazy(() => import('./pages/Admin/DetalleSocio'))
const AgregarSocio = lazy(() => import('./pages/Admin/AgregarSocio'))
const CrearJuegoLibre = lazy(() => import('./pages/Admin/CrearJuegoLibre'))
const EnviarComunicado = lazy(() => import('./pages/Admin/EnviarComunicado'))
const GestionNiveles = lazy(() => import('./pages/Admin/GestionNiveles'))
const ConfigAdmin = lazy(() => import('./pages/Admin/ConfigAdmin'))
const AdminActividades = lazy(() => import('./pages/Admin/AdminActividades'))
const AdminTurnos = lazy(() => import('./pages/Admin/AdminTurnos'))
const ExportarActividades = lazy(() => import('./pages/Admin/ExportarActividades'))
const CrearTorneo = lazy(() => import('./pages/Admin/CrearTorneo'))
const SolicitudesIngreso = lazy(() => import('./pages/Admin/SolicitudesIngreso'))
const GestionBonos = lazy(() => import('./pages/Admin/GestionBonos'))

// Entrenador
const InicioEntrenador = lazy(() => import('./pages/entrenador/InicioEntrenador/InicioEntrenador'))
const MisClasesEntrenador = lazy(() => import('./pages/entrenador/MisClasesEntrenador/MisClasesEntrenador'))
const MisAlumnosEntrenador = lazy(() => import('./pages/entrenador/MisAlumnosEntrenador/MisAlumnosEntrenador'))
const DetalleAlumnoEntrenador = lazy(() => import('./pages/entrenador/DetalleAlumnoEntrenador/DetalleAlumnoEntrenador'))
const MisHorariosEntrenador = lazy(() => import('./pages/entrenador/MisHorariosEntrenador/MisHorariosEntrenador'))
const SolicitudesEntrenador = lazy(() => import('./pages/entrenador/SolicitudesEntrenador/SolicitudesEntrenador'))
const PerfilEntrenador = lazy(() => import('./pages/entrenador/PerfilEntrenador/PerfilEntrenador'))
const PerfilPublicoEntrenador = lazy(() => import('./pages/entrenador/PerfilPublicoEntrenador/PerfilPublicoEntrenador'))

// Rutas protegidas: redirige al inicio correcto si no hay sesión o el rol no coincide
function RutaProtegida({ children, rolesPermitidos }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (rolesPermitidos && !rolesPermitidos.includes(user.tipo_usuario_id)) {
    if (user.tipo_usuario_id === 3) return <Navigate to="/admin" replace />
    if (user.tipo_usuario_id === 2) return <Navigate to="/entrenador/inicio" replace />
    return <Navigate to="/inicio" replace />
  }

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Suspense fallback={<PantallaCargando />}>
    <Routes>
      {/* Pantalla inicial — redirige según rol */}
      <Route
        path="/"
        element={
          !user
            ? <Splash />
            : user.tipo_usuario_id === 3
              ? <Navigate to="/admin" replace />
              : user.tipo_usuario_id === 2
                ? <Navigate to="/entrenador/inicio" replace />
                : <Navigate to="/inicio" replace />
        }
      />

      {/* Auth */}
      <Route path="/login"            element={<Login />} />
      <Route path="/registro"         element={<Registro />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />

      {/* Dev-only: showcase del sistema de diseño. Solo accesible si NODE_ENV !== production */}
      {import.meta.env.DEV && (
        <Route path="/design-system" element={<DesignSystem />} />
      )}

      {/* Socios (tipo_usuario_id = 1) */}
      <Route path="/inicio"             element={<RutaProtegida rolesPermitidos={[1]}><Inicio /></RutaProtegida>} />
      <Route path="/mis-turnos"         element={<RutaProtegida rolesPermitidos={[1]}><MisTurnos /></RutaProtegida>} />
      <Route path="/juego-libre"        element={<RutaProtegida rolesPermitidos={[1]}><JuegoLibre /></RutaProtegida>} />
      <Route path="/clases-particulares" element={<RutaProtegida rolesPermitidos={[1]}><ClasesParticulares /></RutaProtegida>} />
      <Route path="/perfil"             element={<RutaProtegida rolesPermitidos={[1]}><Perfil /></RutaProtegida>} />
      <Route path="/comunicados"        element={<RutaProtegida rolesPermitidos={[1]}><Comunicados /></RutaProtegida>} />
      <Route path="/mis-clases"         element={<RutaProtegida rolesPermitidos={[1]}><MisClases /></RutaProtegida>} />
      <Route path="/torneos"             element={<RutaProtegida rolesPermitidos={[1]}><Torneos /></RutaProtegida>} />
      <Route path="/notificaciones"      element={<RutaProtegida rolesPermitidos={[1]}><Notificaciones /></RutaProtegida>} />
      <Route path="/entrenamientos"      element={<RutaProtegida rolesPermitidos={[1]}><Entrenamientos /></RutaProtegida>} />
      <Route path="/entrenadores/:entrenadorId" element={<RutaProtegida rolesPermitidos={[1]}><PerfilPublicoEntrenador /></RutaProtegida>} />

      {/* Entrenador (tipo_usuario_id = 2) */}
      <Route path="/entrenador/inicio"          element={<RutaProtegida rolesPermitidos={[2]}><InicioEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/mis-clases"      element={<RutaProtegida rolesPermitidos={[2]}><MisClasesEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/mis-alumnos"     element={<RutaProtegida rolesPermitidos={[2]}><MisAlumnosEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/alumnos/:alumnoId" element={<RutaProtegida rolesPermitidos={[2]}><DetalleAlumnoEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/mis-horarios"    element={<RutaProtegida rolesPermitidos={[2]}><MisHorariosEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/solicitudes"     element={<RutaProtegida rolesPermitidos={[2]}><SolicitudesEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/perfil"          element={<RutaProtegida rolesPermitidos={[2]}><PerfilEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/notificaciones"  element={<RutaProtegida rolesPermitidos={[2]}><Notificaciones /></RutaProtegida>} />

      {/* Admin (tipo_usuario_id = 3) */}
      <Route path="/admin"               element={<RutaProtegida rolesPermitidos={[3]}><AdminInicio /></RutaProtegida>} />
      <Route path="/admin/socios"        element={<RutaProtegida rolesPermitidos={[3]}><GestionSocios /></RutaProtegida>} />
      <Route path="/admin/socios/nuevo"  element={<RutaProtegida rolesPermitidos={[3]}><AgregarSocio /></RutaProtegida>} />
      <Route path="/admin/socios/:id"    element={<RutaProtegida rolesPermitidos={[3]}><DetalleSocio /></RutaProtegida>} />
      <Route path="/admin/juego-libre"   element={<RutaProtegida rolesPermitidos={[3]}><CrearJuegoLibre /></RutaProtegida>} />
      <Route path="/admin/comunicado"    element={<RutaProtegida rolesPermitidos={[3]}><EnviarComunicado /></RutaProtegida>} />
      <Route path="/admin/niveles"       element={<RutaProtegida rolesPermitidos={[3]}><GestionNiveles /></RutaProtegida>} />
      <Route path="/admin/config"        element={<RutaProtegida rolesPermitidos={[3]}><ConfigAdmin /></RutaProtegida>} />
      <Route path="/admin/actividades"   element={<RutaProtegida rolesPermitidos={[3]}><AdminActividades /></RutaProtegida>} />
      <Route path="/admin/turnos"        element={<RutaProtegida rolesPermitidos={[3]}><AdminTurnos /></RutaProtegida>} />
      <Route path="/admin/exportar"      element={<RutaProtegida rolesPermitidos={[3]}><ExportarActividades /></RutaProtegida>} />
      <Route path="/admin/torneos"       element={<RutaProtegida rolesPermitidos={[3]}><CrearTorneo /></RutaProtegida>} />
      <Route path="/admin/solicitudes"   element={<RutaProtegida rolesPermitidos={[3]}><SolicitudesIngreso /></RutaProtegida>} />
      <Route path="/admin/bonos/:socioId" element={<RutaProtegida rolesPermitidos={[3]}><GestionBonos /></RutaProtegida>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

/** Mientras se descarga el código de una pantalla. */
function PantallaCargando() {
  return (
    <div style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)' }}>
      <Spinner size="lg" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
