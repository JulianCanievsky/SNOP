import { useEffect, useState } from "react";
import "./MisTurnos.css";
import TurnoCard from "../../components/TurnoCard/TurnoCard";
import { getTurnos } from "../../services/turnosApi";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "../../components/BottomNav/BottomNav";

function MisTurnos() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function cargar() {
      try {
        const data = await getTurnos();
        setTurnos(data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + i);
    const year  = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day   = String(fecha.getDate()).padStart(2, "0");
    return {
      fecha,
      letra: fecha.toLocaleDateString("es-AR", { weekday: "short" }).charAt(0).toUpperCase(),
      numero: fecha.getDate(),
      iso: `${year}-${month}-${day}`,
    };
  });

  // Conjunto de fechas ISO que tienen al menos un turno
  const fechasConTurno = new Set(
    turnos.map((t) => t.turnos?.fecha_inicio?.slice(0, 10)).filter(Boolean)
  );

  const fechaSeleccionada = dias[diaSeleccionado].fecha;

  const turnosFiltrados = turnos.filter(
    (turno) => turno.turnos?.fecha_inicio?.slice(0, 10) === dias[diaSeleccionado].iso
  );

  return (
    <div className="mis-turnos">
      <header className="header">
        <h1>Mis Turnos</h1>
        <p className="subtitulo">Horario fijo semanal</p>
        <div className="dias">
          {dias.map((dia, index) => (
            <div
              key={index}
              className={index === diaSeleccionado ? "dia activa" : "dia"}
              onClick={() => setDiaSeleccionado(index)}
            >
              <span>{dia.letra}</span>
              <strong>{dia.numero}</strong>
              {fechasConTurno.has(dia.iso) && (
                <span className={`dia-punto ${index === diaSeleccionado ? "dia-punto-activo" : ""}`} />
              )}
            </div>
          ))}
        </div>
      </header>

      <main className="contenido">
        {loading ? (
          <p>Cargando...</p>
        ) : turnosFiltrados.length > 0 ? (
          turnosFiltrados.map((turno) => (
            <TurnoCard key={turno.id} turno={turno} />
          ))
        ) : (
          <p className="sin-turnos">No tenés turnos para este día.</p>
        )}
        <p className="aviso-fijo">
          Los turnos son fijos. Para cambiar de día hablá con tu entrenador.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

export default MisTurnos;