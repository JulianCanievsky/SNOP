import { useState } from 'react';
import { useClasesParticulares } from "../hooks/useClasesParticulares";
import ConfirmarClase from "../components/TurnoCard/ConfirmarClase";
import './ClasesParticulares.css';

const formatearDiaHora = (fechaISO) => {
  const fecha = new Date(fechaISO);

  const dias = [
    'Dom',
    'Lun',
    'Mar',
    'Mié',
    'Jue',
    'Vie',
    'Sáb'
  ];

  const dia = fecha.getDate();

  const hora = fecha.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${dias[fecha.getDay()]} ${dia} - ${hora}`;
};

const AvatarEntrenador = ({ nombre, foto_url, tamanio = 'md' }) => {
  const iniciales = nombre
    ? nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className={`avatar-entrenador avatar-${tamanio}`}>
      {foto_url
        ? <img src={foto_url} alt={nombre} />
        : <span>{iniciales}</span>}
    </div>
  );
};

const Estrellas = ({ rating }) => {
  const valor = parseFloat(rating) || 0;

  return (
    <span className="estrellas">
      ⭐ {valor.toFixed(1)}
    </span>
  );
};

const ChipTurno = ({ turno, seleccionado, onClick }) => (
  <button
    className={`chip-turno ${seleccionado ? 'chip-seleccionado' : ''}`}
    onClick={() => onClick(turno)}
  >
    {formatearDiaHora(turno.fecha_inicio)}
    <span className="chip-duracion">{turno.duracion_min} Min</span>
  </button>
);

const TarjetaEntrenador = ({ entrenador, onReservar }) => {
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);

  const handleReservar = () => {
    if (!turnoSeleccionado) return;
    onReservar(entrenador, turnoSeleccionado);
  };

  return (
    <div className="tarjeta-entrenador">
      <div className="entrenador-info">
        <AvatarEntrenador
          nombre={entrenador.nombre}
          foto_url={entrenador.foto_url}
        />

        <div className="entrenador-datos">
          <p className="entrenador-nombre">{entrenador.nombre}</p>

          <div className="entrenador-meta">
            <Estrellas rating={entrenador.rating} />

            <span className="entrenador-tipo">
              · {entrenador.tipo_usuario || 'Entrenador'}
            </span>
          </div>
        </div>
      </div>

      <div className="turnos-seccion">
        <p className="turnos-label">Horarios disponibles:</p>

        <div className="turnos-chips">
          {entrenador.turnos_disponibles.slice(0, 4).map(turno => (
            <ChipTurno
              key={turno.id}
              turno={turno}
              seleccionado={turnoSeleccionado?.id === turno.id}
              onClick={setTurnoSeleccionado}
            />
          ))}
        </div>
      </div>

      <button
        className="btn-reservar"
        onClick={handleReservar}
        disabled={!turnoSeleccionado}
      >
        Reservar clase
      </button>
    </div>
  );
};

const ClasesParticulares = () => {
  const {
    entrenadores,
    cargando,
    error,
    cargarEntrenadores,
    enviarSolicitud
  } = useClasesParticulares();

  const [reserva, setReserva] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState('');

  const handleReservar = (entrenador, turno) => {
    setReserva({ entrenador, turno });
    setExito(false);
  };

  const handleConfirmar = async () => {
    if (!reserva) return;

    try {
      setEnviando(true);

      await enviarSolicitud({
        entrenador_id: reserva.entrenador.id,
        turno_id: reserva.turno.id,
      });

      setExito(true);
      setReserva(null);

      await cargarEntrenadores();
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'Error al enviar la solicitud'
      );
    } finally {
      setEnviando(false);
    }
  };

 const entrenadoresFiltrados = entrenadores
  .map(entrenador => ({
    ...entrenador,
    turnos_disponibles: entrenador.turnos_disponibles.filter(turno => {
      if (!fechaFiltro) return true;

      const fechaTurno = new Date(turno.fecha_inicio);

      const año = fechaTurno.getFullYear();
      const mes = String(fechaTurno.getMonth() + 1).padStart(2, '0');
      const dia = String(fechaTurno.getDate()).padStart(2, '0');

      const fechaFormateada = `${año}-${mes}-${dia}`;

      return fechaFormateada === fechaFiltro;
    })
  }))
  .filter(entrenador => entrenador.turnos_disponibles.length > 0);
  if (reserva) {
    return (
      <ConfirmarClase
        entrenador={reserva.entrenador}
        turno={reserva.turno}
        onVolver={() => setReserva(null)}
        onConfirmar={handleConfirmar}
        enviando={enviando}
      />
    );
  }

  return (
    <div className="clases-container">
      <div className="clases-header">
        <div className="clases-header-contenido">
          <h1 className="clases-titulo">
            Clases particulares
          </h1>

          <p className="clases-subtitulo">
            Reservá con un entrenador — pago aparte
          </p>
        </div>
      </div>

      <div className="clases-body">

        {exito && (
          <div className="alerta-exito">
            ✓ Solicitud enviada. El entrenador la revisará pronto.
          </div>
        )}

        <div className="filtro-fecha">
          <label>Buscar por día</label>

          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
          />
        </div>

        <p className="seccion-label">
          ENTRENADORES DISPONIBLES
        </p>

        {cargando && (
          <div className="estado-carga">
            <div className="spinner" />
            <span>Cargando entrenadores...</span>
          </div>
        )}

        {error && (
          <div className="estado-error">
            <p>{error}</p>

            <button
              onClick={cargarEntrenadores}
              className="btn-reintentar"
            >
              Reintentar
            </button>
          </div>
        )}

        {!cargando &&
          !error &&
          entrenadoresFiltrados.length === 0 && (
            <div className="estado-vacio">
              <div className="estado-vacio-icono">🏓</div>

              <p className="estado-vacio-titulo">
                No hay entrenadores para esa fecha
              </p>

              <p className="estado-vacio-sub">
                Probá seleccionando otro día
              </p>
            </div>
          )}

        {!cargando &&
          !error &&
          entrenadoresFiltrados.map(entrenador => (
            <TarjetaEntrenador
              key={entrenador.id}
              entrenador={entrenador}
              onReservar={handleReservar}
            />
          ))}
      </div>
    </div>
  );
};

export default ClasesParticulares;