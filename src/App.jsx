import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Splash             from './pages/Splash/Splash'
import Login              from './pages/login/login'
import Registro           from './pages/registro/registro'
import ForgotPassword     from './pages/ForgotPassword/ForgotPassword'
import ResetPassword      from './pages/ResetPassword/ResetPassword'
import Inicio             from './pages/Inicio/Inicio'
import MisTurnos          from './pages/MisTurnos/MisTurnos'
import JuegoLibre         from './pages/JuegoLibre/JuegoLibre'
import ClasesParticulares from './pages/ClasesParticulares/ClasesParticulares'
import Perfil             from './pages/Perfil/Perfil'
import Comunicados        from './pages/Comunicados/Comunicados'
import MisClases          from './pages/MisClases/MisClases'
import Torneos            from './pages/Torneos/Torneos'
import Notificaciones     from './pages/Notificaciones/Notificaciones'

// Admin
import AdminInicio        from './pages/Admin/AdminInicio'
import GestionSocios      from './pages/Admin/GestionSocios'
import DetalleSocio       from './pages/Admin/DetalleSocio'
import AgregarSocio       from './pages/Admin/AgregarSocio'
import CrearJuegoLibre    from './pages/Admin/CrearJuegoLibre'
import EnviarComunicado   from './pages/Admin/EnviarComunicado'
import GestionNiveles     from './pages/Admin/GestionNiveles'
import ConfigAdmin        from './pages/Admin/ConfigAdmin'
import AdminActividades   from './pages/Admin/AdminActividades'
import AdminTurnos        from './pages/Admin/AdminTurnos'
import ExportarActividades from './pages/Admin/ExportarActividades'
import CrearTorneo        from './pages/Admin/CrearTorneo'
import SolicitudesIngreso  from './pages/Admin/SolicitudesIngreso'
import GestionBonos       from './pages/Admin/GestionBonos'

// Entrenador
import InicioEntrenador        from './pages/entrenador/InicioEntrenador/InicioEntrenador'
import MisClasesEntrenador     from './pages/entrenador/MisClasesEntrenador/MisClasesEntrenador'
import MisAlumnosEntrenador    from './pages/entrenador/MisAlumnosEntrenador/MisAlumnosEntrenador'
import DetalleAlumnoEntrenador from './pages/entrenador/DetalleAlumnoEntrenador/DetalleAlumnoEntrenador'
import MisHorariosEntrenador   from './pages/entrenador/MisHorariosEntrenador/MisHorariosEntrenador'
import SolicitudesEntrenador   from './pages/entrenador/SolicitudesEntrenador/SolicitudesEntrenador'
import PerfilEntrenador        from './pages/entrenador/PerfilEntrenador/PerfilEntrenador'

// Rutas protegidas: redirige al inicio correcto si no hay sesión o el rol no coincide
function RutaProtegida({ children, rolesPermitidos }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  if (rolesPermitidos && !rolesPermitidos.includes(user.tipo_usuario_id)) {
    // Redirige a la pantalla principal del rol real del usuario
    if (user.tipo_usuario_id === 3) return <Navigate to="/admin" replace />
    if (user.tipo_usuario_id === 2) return <Navigate to="/entrenador/inicio" replace />
    return <Navigate to="/inicio" replace />
  }

  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  // Espera a que AuthContext restaure la sesión antes de redirigir
  if (loading) return null

  return (
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

      {/* Entrenador (tipo_usuario_id = 2) */}
      <Route path="/entrenador/inicio"          element={<RutaProtegida rolesPermitidos={[2]}><InicioEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/mis-clases"      element={<RutaProtegida rolesPermitidos={[2]}><MisClasesEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/mis-alumnos"     element={<RutaProtegida rolesPermitidos={[2]}><MisAlumnosEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/alumnos/:alumnoId" element={<RutaProtegida rolesPermitidos={[2]}><DetalleAlumnoEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/mis-horarios"    element={<RutaProtegida rolesPermitidos={[2]}><MisHorariosEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/solicitudes"     element={<RutaProtegida rolesPermitidos={[2]}><SolicitudesEntrenador /></RutaProtegida>} />
      <Route path="/entrenador/perfil"          element={<RutaProtegida rolesPermitidos={[2]}><PerfilEntrenador /></RutaProtegida>} />

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
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
