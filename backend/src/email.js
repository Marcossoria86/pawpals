// Envío de mails transaccionales (por ahora sólo "recuperar contraseña")
// usando la API de Resend (https://resend.com). Elegido por el usuario por
// ser simple de integrar (una sola llamada HTTP, sin SDK de mensajería
// pesado) y tener un plan gratuito que alcanza de sobra para esta app.
//
// Hace falta crear una cuenta en resend.com, conseguir una API key, y
// cargarla en Render como variable de entorno RESEND_API_KEY en el servicio
// pawpals-api (Settings → Environment). Opcionalmente también se puede
// definir RESEND_FROM (por ejemplo "PawPals <hola@tu-dominio.com>") una vez
// que se verifique un dominio propio en Resend — mientras tanto se manda
// desde la dirección de pruebas que Resend da por defecto.
//
// Si la variable de entorno no está configurada, no se rompe nada: se
// registra un aviso en los logs y se sigue (útil para desarrollo local sin
// mandar mails de verdad).
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.RESEND_FROM || 'PawPals <onboarding@resend.dev>';

async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — no se envió el mail de recuperación. Enlace (para pruebas):', resetUrl);
    return { sent: false };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [toEmail],
        subject: 'Recuperá tu contraseña de PawPals',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>🐾 PawPals</h2>
            <p>Recibimos un pedido para restablecer la contraseña de tu cuenta.</p>
            <p>
              <a href="${resetUrl}" style="display:inline-block;background:#c9683f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">
                Elegir nueva contraseña
              </a>
            </p>
            <p>Este enlace es válido por 1 hora. Si no pediste esto, podés ignorar este mail — tu contraseña sigue siendo la misma.</p>
          </div>
        `
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[email] Resend respondió con error', res.status, body);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('[email] No se pudo enviar el mail de recuperación', err);
    return { sent: false };
  }
}

module.exports = { sendPasswordResetEmail };
