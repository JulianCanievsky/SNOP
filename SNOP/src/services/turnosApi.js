import axios from 'axios'

const API_URL = 'http://localhost:3000/api/turnos'

function getUserId() {
  const raw = localStorage.getItem('snop_user')
  if (!raw) throw new Error('No hay sesión activa')
  return JSON.parse(raw).id
}

export async function getTurnos() {
  const socioId = getUserId()
  const response = await axios.get(`${API_URL}/${socioId}`)
  return response.data.data
}

export async function cancelarTurno(turnoId) {
  const socioId = getUserId()
  const response = await axios.delete(`${API_URL}/${turnoId}/socio/${socioId}`)
  return response.data
}

export async function reconfirmarTurno(turnoId) {
  const socioId = getUserId()
  const response = await axios.patch(`${API_URL}/${turnoId}/socio/${socioId}/reconfirmar`)
  return response.data
}
