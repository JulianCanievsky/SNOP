import axios from "axios";

const API_URL = "http://localhost:3001/api/turnos";
const SOCIO_ID = 999;

export async function getTurnos() {
  const response = await axios.get(`${API_URL}/${SOCIO_ID}`);
  return response.data.data;
}

export async function cancelarTurno(turnoId) {
  const response = await axios.delete(`${API_URL}/${turnoId}/socio/${SOCIO_ID}`);
  return response.data;
}

export async function reconfirmarTurno(turnoId) {
  const response = await axios.patch(`${API_URL}/${turnoId}/socio/${SOCIO_ID}/reconfirmar`);
  return response.data;
}