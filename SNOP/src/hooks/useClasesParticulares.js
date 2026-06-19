import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const obtenerToken = () => localStorage.getItem('snop_token');

export const useClasesParticulares = () => {
  const [entrenadores, setEntrenadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarEntrenadores = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const { data } = await axios.get(`${API_BASE}/clases-particulares/entrenadores`, {
        headers: { Authorization: `Bearer ${obtenerToken()}` },
      });
      setEntrenadores(data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar entrenadores');
    } finally {
      setCargando(false);
    }
  }, []);
  const obtenerToken = () => {
  const token = localStorage.getItem('snop_token');
  console.log('TOKEN:', token);
  return token;
};

  useEffect(() => {
    cargarEntrenadores();
  }, [cargarEntrenadores]);

  const obtenerEntrenador = async (entrenadorId) => {
    const { data } = await axios.get(
      `${API_BASE}/clases-particulares/entrenadores/${entrenadorId}`,
      { headers: { Authorization: `Bearer ${obtenerToken()}` } }
    );
    return data.data;
  };

  const enviarSolicitud = async ({ entrenador_id, turno_id, mensaje }) => {
    const { data } = await axios.post(
      `${API_BASE}/clases-particulares/solicitar`,
      { entrenador_id, turno_id, mensaje },
      { headers: { Authorization: `Bearer ${obtenerToken()}` } }
    );
    return data;
  };

  return { entrenadores, cargando, error, cargarEntrenadores, obtenerEntrenador, enviarSolicitud };
};