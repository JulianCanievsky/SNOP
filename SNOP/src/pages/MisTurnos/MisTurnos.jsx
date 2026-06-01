import {
  useEffect,
  useState
} from "react";

import "./MisTurnos.css";

import TurnoCard
from "../../components/TurnoCard/TurnoCard";

import {
  getTurnos
} from "../../services/turnosApi";

function MisTurnos() {

  const [turnos, setTurnos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [diaSeleccionado, setDiaSeleccionado] =
    useState(0);

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

  const dias =
    Array.from({ length: 7 }, (_, i) => {

      const fecha = new Date();

      fecha.setDate(
        fecha.getDate() + i
      );

      return {
        fecha,
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

  const fechaSeleccionada =
    dias[diaSeleccionado].fecha;

  const turnosFiltrados =
    turnos.filter((turno) => {

      const fechaTurno =
        new Date(
          turno.turnos.fecha_inicio
        );

      return (
        fechaTurno.getDate() ===
          fechaSeleccionada.getDate() &&
        fechaTurno.getMonth() ===
          fechaSeleccionada.getMonth() &&
        fechaTurno.getFullYear() ===
          fechaSeleccionada.getFullYear()
      );
    });

  return (

    <div className="mis-turnos">

      <header className="header">

        <h1>Mis Turnos</h1>

        <div className="dias">

          {dias.map((dia, index) => (

            <div
              key={index}
              className={
                index === diaSeleccionado
                  ? "dia activa"
                  : "dia"
              }
              onClick={() =>
                setDiaSeleccionado(index)
              }
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

        ) : turnosFiltrados.length > 0 ? (

          turnosFiltrados.map((turno) => (

            <TurnoCard
              key={turno.id}
              turno={turno}
            />
          ))

        ) : (

          <p className="sin-turnos">
            No tenés turnos para este día.
          </p>

        )}

      </main>

    </div>
  );
}

export default MisTurnos;