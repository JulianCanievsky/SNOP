/**
 * src/lib/notificaciones.js
 * Helper para crear notificaciones in-app + enviar email transaccional (Resend).
 *
 * IMPORTANTE: RESEND_FROM y FRONTEND_URL se leen en cada llamada (no al importar)
 * para que siempre reflejen el valor real del entorno, incluso si dotenv carga
 * las variables después de que este módulo fue importado por primera vez.
 */
import supabase from '../config/db.js'

// ── Helpers internos ──────────────────────────────────────────────────────────
function getFrom() {
  return process.env.RESEND_FROM || 'SNOP Club <noreply@snoptdm.com>'
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'https://snop-psi.vercel.app'
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Crea una notificación in-app para un usuario.
 */
export async function crearNotificacion({ user_id, titulo, mensaje, tipo, link }) {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .insert({ user_id, titulo, mensaje, tipo, link: link ?? null })
    if (error && error.code !== '42P01') {
      console.error('[notif] error al crear notificación:', error)
    }
  } catch (err) {
    console.error('[notif] excepción al crear notificación:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * Envía un email transaccional con Resend.
 * Lanza un log de error explícito si falla — nunca falla en silencio.
 */
export async function enviarEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        `[email] CRÍTICO: RESEND_API_KEY no configurada. ` +
        `Email NO enviado a ${to} — Asunto: "${subject}"`
      )
    } else {
      // Dev: imprimir en consola para poder probar sin Resend
      console.log(`\n[DEV EMAIL] Para: ${to}\nAsunto: ${subject}\n${html.replace(/<[^>]+>/g, '').trim()}\n`)
    }
    return
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const { data, error: sendError } = await resend.emails.send({
      from:    getFrom(),
      to,
      subject,
      html,
    })

    if (sendError) {
      console.error(`[email] Resend API error al enviar a ${to}:`, JSON.stringify(sendError))
    } else {
      console.log(`[email] Enviado correctamente a ${to} (id: ${data?.id ?? '?'})`)
    }
  } catch (err) {
    console.error(`[email] Excepción al enviar a ${to}:`, err?.message ?? err)
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function emailSolicitudAceptada({ nombre, clubNombre }) {
  const url = getFrontendUrl()
  return {
    subject: `¡Bienvenido/a a ${clubNombre}! — SNOP`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#2563eb;margin:0 0 8px;">¡Tu solicitud fue aprobada!</h2>
        <p style="color:#555;margin:0 0 16px;">Hola <strong>${nombre}</strong>, ya sos parte de <strong>${clubNombre}</strong>.</p>
        <a href="${url}/login"
           style="display:inline-block;padding:14px 28px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:15px;">
          Iniciar sesión
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px;">Si no solicitaste esto, ignorá este email.</p>
      </div>
    `,
  }
}

export function emailSolicitudRechazada({ nombre, clubNombre }) {
  return {
    subject: `Solicitud de ingreso a ${clubNombre} — SNOP`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#ef4444;margin:0 0 8px;">Solicitud no aprobada</h2>
        <p style="color:#555;margin:0 0 16px;">Hola <strong>${nombre}</strong>, lamentablemente tu solicitud para unirte a <strong>${clubNombre}</strong> no fue aprobada.</p>
        <p style="color:#555;margin:0;">Si creés que es un error, contactá directamente al club.</p>
      </div>
    `,
  }
}

export function emailTurnoAsignado({ nombre, fechaTurno, sede }) {
  const url = getFrontendUrl()
  return {
    subject: 'Nuevo turno asignado — SNOP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#2563eb;margin:0 0 8px;">Te asignaron un turno</h2>
        <p style="color:#555;margin:0 0 8px;">Hola <strong>${nombre}</strong>,</p>
        <p style="color:#555;margin:0 0 16px;">Tenés un nuevo turno confirmado:</p>
        <div style="background:#eef2ff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-weight:700;color:#1e293b;">${fechaTurno}</p>
          <p style="margin:0;color:#64748b;font-size:13px;">📍 ${sede}</p>
        </div>
        <a href="${url}/mis-clases"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
          Ver mis clases
        </a>
      </div>
    `,
  }
}

export function emailClaseConfirmada({ nombre, fechaTurno, entrenador, sede }) {
  const url = getFrontendUrl()
  return {
    subject: 'Clase particular confirmada — SNOP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#2563eb;margin:0 0 8px;">Tu clase fue confirmada</h2>
        <p style="color:#555;margin:0 0 16px;">Hola <strong>${nombre}</strong>, tu clase particular fue confirmada:</p>
        <div style="background:#eef2ff;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-weight:700;color:#1e293b;">${fechaTurno}</p>
          <p style="margin:0 0 2px;color:#64748b;font-size:13px;">👨‍🏫 ${entrenador}</p>
          <p style="margin:0;color:#64748b;font-size:13px;">📍 ${sede}</p>
        </div>
        <a href="${url}/mis-clases"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
          Ver mis clases
        </a>
      </div>
    `,
  }
}

export function emailClaseRechazada({ nombre, fechaTurno, entrenador }) {
  const url = getFrontendUrl()
  return {
    subject: 'Solicitud de clase rechazada — SNOP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#ef4444;margin:0 0 8px;">Solicitud rechazada</h2>
        <p style="color:#555;margin:0 0 16px;">Hola <strong>${nombre}</strong>, <strong>${entrenador}</strong> no pudo confirmar tu clase del ${fechaTurno}.</p>
        <a href="${url}/clases-particulares"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
          Buscar otro horario
        </a>
      </div>
    `,
  }
}

export function emailListaEsperaPromovido({ nombre, fechaTurno, sede }) {
  const url = getFrontendUrl()
  return {
    subject: '¡Conseguiste un lugar! — SNOP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#16a34a;margin:0 0 8px;">¡Tenés lugar!</h2>
        <p style="color:#555;margin:0 0 16px;">Hola <strong>${nombre}</strong>, se liberó un cupo y fuiste promovido/a de la lista de espera.</p>
        <div style="background:#f0fdf4;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-weight:700;color:#1e293b;">${fechaTurno}</p>
          <p style="margin:0;color:#64748b;font-size:13px;">📍 ${sede}</p>
        </div>
        <p style="color:#555;margin:0 0 20px;">Ya estás confirmado/a. Nos vemos en la clase.</p>
        <a href="${url}/mis-clases"
           style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
          Ver mis clases
        </a>
      </div>
    `,
  }
}

export function emailTurnoCanceladoSemana({ nombre, fechaTurno, sede }) {
  const url = getFrontendUrl()
  return {
    subject: 'Turno cancelado esta semana — SNOP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#d97706;margin:0 0 8px;">Turno cancelado esta semana</h2>
        <p style="color:#555;margin:0 0 16px;">Hola <strong>${nombre}</strong>, el siguiente turno fue cancelado para esta semana:</p>
        <div style="background:#fffbeb;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
          <p style="margin:0 0 4px;font-weight:700;color:#1e293b;">${fechaTurno}</p>
          <p style="margin:0;color:#64748b;font-size:13px;">📍 ${sede}</p>
        </div>
        <p style="color:#555;margin:0;">El turno vuelve la semana siguiente normalmente.</p>
      </div>
    `,
  }
}
