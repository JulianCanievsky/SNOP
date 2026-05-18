import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const router = express.Router()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization

  const token =
    authHeader &&
    authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Token requerido'
    })
  }

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    req.socio_id = decoded.id

    next()

  } catch {

    return res.status(403).json({
      error: 'Token inválido'
    })
  }
}

router.get(
  '/',
  verificarToken,
  async (req, res) => {

    try {

      const { data, error } =
        await supabase
          .from('juego_libre')
          .select('*')

      if (error) throw error

      res.json(data)

    } catch (error) {

      console.error(error)

      res.status(500).json({
        error:
          'Error al obtener juego libre'
      })
    }
  }
)

export default router