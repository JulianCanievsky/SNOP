import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Splash    from './pages/Splash/Splash'
import Login     from './pages/login/login'
import Registro  from './pages/registro/registro'
import Inicio    from './pages/Inicio/Inicio'
import MisTurnos from './pages/MisTurnos/MisTurnos'
import JuegoLibre from './pages/JuegoLibre/JuegoLibre'

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

      {/* TODO: agregar rutas para entrenador (2) y admin (3) */}

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
