  import { useState, useEffect, useCallback } from 'react';
  import axios from 'axios';

  const API_BASE = 'http://localhost:3000';

  const obtenerToken = () => localStorage.getItem('snop_token');

  export const useJuegoLibre = () => {
    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const cargarEventos = useCallback(async (filtros = {}) => {
      try {
        setCargando(true);
        setError(null);
        const params = new URLSearchParams();
        if (filtros.sede_id) params.append('sede_id', filtros.sede_id);
        if (filtros.fecha) params.append('fecha', filtros.fecha);

        const { data } = await axios.get(`${API_BASE}/juego-libre?${params}`, {
          headers: { Authorization: `Bearer ${obtenerToken()}` },
        });
    setEventos(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar los eventos');
      } finally {
        setCargando(false);
      }
    }, []);

    useEffect(() => {
      cargarEventos();
    }, [cargarEventos]);

    const inscribirse = async (eventoId) => {
      const { data } = await axios.post(
        `${API_BASE}/juego-libre/${eventoId}/inscribir`,
        {},
        { headers: { Authorization: `Bearer ${obtenerToken()}` } }
      );
      return data;
    };

    const cancelarInscripcion = async (eventoId) => {
      const { data } = await axios.delete(
        `${API_BASE}/juego-libre/${eventoId}/cancelar`,
        { headers: { Authorization: `Bearer ${obtenerToken()}` } }
      );
      return data;
    };

    return { eventos, cargando, error, cargarEventos, inscribirse, cancelarInscripcion };
  };