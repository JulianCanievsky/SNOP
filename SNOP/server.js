import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import turnosRouter from "./src/routes/turnos.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get("/", (req, res) => {
  res.json({
    ok: true,
    mensaje: "API funcionando"
  });
});

app.use("/api/turnos", turnosRouter);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});