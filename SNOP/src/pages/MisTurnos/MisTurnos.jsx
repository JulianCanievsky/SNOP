import {
  useEffect,
  useState
} from "react";

import "./MisTurnos.css";

import TurnoCard
from "../../components/TurnoCard/TurnoCard";

import {
  getTurnos
} from "../../services/turnosService";

function MisTurnos() {

  const [turnos, setTurnos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    async function cargar() {

      try {

        const data =
          await getTurnos();

        setTurnos(data || []);

      } catch (error) {

        console.error(error);

      } finally {

        setLoading(false);
      }
    }

    cargar();

  }, []);

  // DIAS REALES DINÁMICOS
  const dias =
    Array.from({ length: 7 }, (_, i) => {

      const fecha = new Date();

      fecha.setDate(
        fecha.getDate() + i
      );

      return {

        letra:
          fecha
            .toLocaleDateString(
              "es-AR",
              {
                weekday: "short"
              }
            )
            .charAt(0)
            .toUpperCase(),

        numero:
          fecha.getDate()
      };
    });

  return (

    <div className="mis-turnos">

      <header className="header">

        <h1>Mis Turnos</h1>

        <div className="dias">

          {dias.map((dia, index) => (

            <div
              key={index}
              className="dia"
            >

              <span>
                {dia.letra}
              </span>

              <strong>
                {dia.numero}
              </strong>

            </div>
          ))}

        </div>

      </header>

      <main className="contenido">

        {loading ? (

          <p>Cargando...</p>

        ) : (

          turnos.map((turno) => (

            <TurnoCard
              key={turno.id}
              turno={turno}
            />
          ))
        )}

      </main>

    </div>
  );
}

export default MisTurnos;