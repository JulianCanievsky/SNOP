/**
 * src/lib/notificaciones.js
 * Helper para crear notificaciones in-app + enviar email transaccional (Resend).
 * Patrón: si RESEND_API_KEY está seteada envía el email; si no, loguea en consola.
 */
import supabase from '../config/db.js'

const RESEND_FROM = process.env.RESEND_FROM || 'SNOP Club <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

/**
 * Crea una notificación in-app para un usuario.
 * @param {{ user_id, titulo, mensaje, tipo, link? }} params
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

/**
 * Envía un email transaccional con Resend.
 * Si RESEND_API_KEY no está configurada, loguea el contenido en consola.
 */
export async function enviarEmail({ to, subject, html }) {
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({ from: RESEND_FROM, to, subject, html })
    } catch (err) {
      console.error('[email] error al enviar con Resend:', err)
    }
  } else {
    console.log(`\n[DEV] EMAIL para ${to}\nAsunto: ${subject}\n${html.replace(/<[^>]+>/g, '')}\n`)
  }
}

// ── Templates de emails ───────────────────────────────────────────────────────

export function emailSolicitudAceptada({ nombre, clubNombre }) {
  return {
    subject: `¡Bienvenido/a a ${clubNombre}! — SNOP`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#2563eb;margin:0 0 8px;">¡Tu solicitud fue aprobada!</h2>
        <p style="color:#555;margin:0 0 16px;">Hola <strong>${nombre}</strong>, ya sos parte de <strong>${clubNombre}</strong>.</p>
        <a href="${FRONTEND_URL}/login"
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
        <a href="${FRONTEND_URL}/mis-turnos"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
          Ver mis turnos
        </a>
      </div>
    `,
  }
}

export function emailClaseConfirmada({ nombre, fechaTurno, entrenador, sede }) {
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
        <a href="${FRONTEND_URL}/mis-turnos"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
          Ver mis turnos
        </a>
      </div>
    `,
  }
}

export function emailClaseRechazada({ nombre, fechaTurno, entrenador }) {
  return {
    subject: 'Solicitud de clase rechazada — SNOP',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f9fc;border-radius:12px;">
        <h2 style="color:#ef4444;margin:0 0 8px;">Solicitud rechazada</h2>
        <p style="color:#555;margin:0 0 16px;">Hola <strong>${nombre}</strong>, <strong>${entrenador}</strong> no pudo confirmar tu clase del ${fechaTurno}.</p>
        <a href="${FRONTEND_URL}/clases-particulares"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:28px;text-decoration:none;font-weight:700;font-size:14px;">
          Buscar otro horario
        </a>
      </div>
    `,
  }
}
