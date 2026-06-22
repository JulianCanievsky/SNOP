import { useEffect, useState } from 'react';
import axios from 'axios';

export const usePerfil = () => {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarPerfil = async () => {
    try {
      setCargando(true);

      const { data } = await axios.get(
        'http://localhost:3000/api/perfil'
      );

      setPerfil(data.data);

    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  return {
    perfil,
    cargando,
    cargarPerfil
  };
};