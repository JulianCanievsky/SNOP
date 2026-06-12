import { useEffect, useState } from "react";
import "./MisTurnos.css";
import TurnoCard from "../../components/TurnoCard/TurnoCard";
import { getTurnos } from "../../services/turnosApi";
import { useNavigate, useLocation } from "react-router-dom";

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
    return {
      fecha,
      letra: fecha.toLocaleDateString("es-AR", { weekday: "short" }).charAt(0).toUpperCase(),
      numero: fecha.getDate(),
    };
  });

  const fechaSeleccionada = dias[diaSeleccionado].fecha;

  const turnosFiltrados = turnos.filter((turno) => {
  const fechaTurno = turno.turnos.fecha_inicio.slice(0, 10);

  const year = fechaSeleccionada.getFullYear();
  const month = String(fechaSeleccionada.getMonth() + 1).padStart(2, "0");
  const day = String(fechaSeleccionada.getDate()).padStart(2, "0");
  const fechaComp = `${year}-${month}-${day}`;

  console.log("fechaTurno:", fechaTurno, "| fechaComp:", fechaComp);

  return fechaTurno === fechaComp;
});

  const navItems = [
    { label: "Inicio", icon: "🏠", path: "/" },
    { label: "Turnos", icon: "📅", path: "/mis-turnos" },
    { label: "Juego libre", icon: "🎾", path: "/juego-libre" },
    { label: "Perfil", icon: "👤", path: "/perfil" },
  ];

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

      
    </div>
  );
}

export default MisTurnos;