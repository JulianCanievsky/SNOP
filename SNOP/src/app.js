require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const turnosRouter = require('./routes/turnos');
// A medida que agregues pantallas, importás sus routers acá:
// const authRouter        = require('./routes/auth');
// const sociosRouter      = require('./routes/socios');
// const juegoLibreRouter  = require('./routes/juegoLibre');
// const clasesRouter      = require('./routes/clases');
// const adminRouter       = require('./routes/admin');

const app = express();

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ estado: 'ok' }));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api', turnosRouter);
// app.use('/api', authRouter);
// app.use('/api', sociosRouter);
// app.use('/api/admin', adminRouter);

// ── Manejo de errores global ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const PUERTO = process.env.PORT || 3001;
app.listen(PUERTO, () => {
  console.log(`Servidor SNOP corriendo en puerto ${PUERTO}`);
});

module.exports = app;