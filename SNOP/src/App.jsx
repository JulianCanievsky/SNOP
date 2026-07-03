import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Splash             from './pages/Splash/Splash'
import Login              from './pages/login/login'
import Registro           from './pages/registro/registro'
import Inicio             from './pages/Inicio/Inicio'
import MisTurnos          from './pages/MisTurnos/MisTurnos'
import JuegoLibre         from './pages/JuegoLibre/JuegoLibre'
import ClasesParticulares from './pages/ClasesParticulares/ClasesParticulares'
import Perfil             from './pages/Perfil/Perfil'

// Entrenador
import InicioEntrenador       from './pages/entrenador/InicioEntrenador/InicioEntrenador'
import MisClasesEntrenador    from './pages/entrenador/MisClasesEntrenador/MisClasesEntrenador'
import MisAlumnosEntrenador   from './pages/entrenador/MisAlumnosEntrenador/MisAlumnosEntrenador'
import DetalleAlumnoEntrenador from './pages/entrenador/DetalleAlumnoEntrenador/DetalleAlumnoEntrenador'
import MisHorariosEntrenador  from './pages/entrenador/MisHorariosEntrenador/MisHorariosEntrenador'
import SolicitudesEntrenador  from './pages/entrenador/SolicitudesEntrenador/SolicitudesEntrenador'
import PerfilEntrenador       from './pages/entrenador/PerfilEntrenador/PerfilEntrenador'

// Rutas protegidas: redirige al login si no hay sesión
function RutaProtegida({ children, rolesPermitidos }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (rolesPermitidos && !rolesPermitidos.includes(user.tipo_usuario_id)) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  // Mientras Supabase restaura la sesión, no renderizar nada
  // para evitar flashes de Splash o redirecciones prematuras
  if (loading) return null

  return (
    <Routes>
      {/* Pantalla inicial: Splash solo si no hay sesión */}
      <Route
        path="/"
        element={
          !user
            ? <Splash />
            : user.tipo_usuario_id === 2
              ? <Navigate to="/entrenador/inicio" replace />
              : <Navigate to="/inicio" replace />
        }
      />

      {/* Auth */}
      <Route path="/login"    element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      {/* Socios (tipo_usuario_id = 1) */}
      <Route
        path="/inicio"
        element={
          <RutaProtegida rolesPermitidos={[1]}>
            <Inicio />
          </RutaProtegida>
        }
      />
      <Route
        path="/mis-turnos"
        element={
          <RutaProtegida rolesPermitidos={[1]}>
            <MisTurnos />
          </RutaProtegida>
        }
      />
      <Route
        path="/juego-libre"
        element={
          <RutaProtegida rolesPermitidos={[1]}>
            <JuegoLibre />
          </RutaProtegida>
        }
      />
      <Route
        path="/clases-particulares"
        element={
          <RutaProtegida rolesPermitidos={[1]}>
            <ClasesParticulares />
          </RutaProtegida>
        }
      />
      <Route
        path="/perfil"
        element={
          <RutaProtegida rolesPermitidos={[1]}>
            <Perfil />
          </RutaProtegida>
        }
      />

      {/* Entrenador (tipo_usuario_id = 2) */}
      <Route
        path="/entrenador/inicio"
        element={
          <RutaProtegida rolesPermitidos={[2]}>
            <InicioEntrenador />
          </RutaProtegida>
        }
      />
      <Route
        path="/entrenador/mis-clases"
        element={
          <RutaProtegida rolesPermitidos={[2]}>
            <MisClasesEntrenador />
          </RutaProtegida>
        }
      />
      <Route
        path="/entrenador/mis-alumnos"
        element={
          <RutaProtegida rolesPermitidos={[2]}>
            <MisAlumnosEntrenador />
          </RutaProtegida>
        }
      />
      <Route
        path="/entrenador/alumnos/:alumnoId"
        element={
          <RutaProtegida rolesPermitidos={[2]}>
            <DetalleAlumnoEntrenador />
          </RutaProtegida>
        }
      />
      <Route
        path="/entrenador/mis-horarios"
        element={
          <RutaProtegida rolesPermitidos={[2]}>
            <MisHorariosEntrenador />
          </RutaProtegida>
        }
      />
      <Route
        path="/entrenador/solicitudes"
        element={
          <RutaProtegida rolesPermitidos={[2]}>
            <SolicitudesEntrenador />
          </RutaProtegida>
        }
      />
      <Route
        path="/entrenador/perfil"
        element={
          <RutaProtegida rolesPermitidos={[2]}>
            <PerfilEntrenador />
          </RutaProtegida>
        }
      />

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
