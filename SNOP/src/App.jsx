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
  const { user } = useAuth()

  return (
    <Routes>
      {/* Pantalla inicial */}
      <Route
        path="/"
        element={user ? <Navigate to="/inicio" replace /> : <Splash />}
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

      {/* TODO: agregar rutas para entrenador (2) y admin (3) */}

      {/* Admin (tipo_usuario_id = 3) */}
      <Route path="/admin" element={<RutaProtegida rolesPermitidos={[3]}><AdminInicio /></RutaProtegida>} />
      <Route path="/admin/socios" element={<RutaProtegida rolesPermitidos={[3]}><GestionSocios /></RutaProtegida>} />
      <Route path="/admin/socios/nuevo" element={<RutaProtegida rolesPermitidos={[3]}><AgregarSocio /></RutaProtegida>} />
      <Route path="/admin/socios/:id" element={<RutaProtegida rolesPermitidos={[3]}><DetalleSocio /></RutaProtegida>} />
      <Route path="/admin/juego-libre" element={<RutaProtegida rolesPermitidos={[3]}><CrearJuegoLibre /></RutaProtegida>} />
      <Route path="/admin/comunicado" element={<RutaProtegida rolesPermitidos={[3]}><EnviarComunicado /></RutaProtegida>} />
      <Route path="/admin/niveles" element={<RutaProtegida rolesPermitidos={[3]}><GestionNiveles /></RutaProtegida>} />
      <Route path="/admin/config" element={<RutaProtegida rolesPermitidos={[3]}><ConfigAdmin /></RutaProtegida>} />
      <Route path="/admin/actividades" element={<RutaProtegida rolesPermitidos={[3]}><AdminActividades /></RutaProtegida>} />

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
