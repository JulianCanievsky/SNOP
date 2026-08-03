import dotenv from 'dotenv'
// dotenv.config() debe correr antes de leer process.env.
// En ESM los imports se resuelven antes que el cuerpo del módulo importador,
// por eso lo llamamos aquí y no solo en server.js.
dotenv.config()

import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Faltan variables de entorno del servidor: SUPABASE_URL y/o SUPABASE_SERVICE_KEY'
  )
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default supabase
