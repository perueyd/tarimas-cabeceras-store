// Avisos de errores en producción.
//
// POR QUÉ EXISTE: los fallos de la tienda solo quedaban en los registros de
// Vercel, que nadie mira. Un cobro hecho sin pedido guardado, una pantalla en
// blanco en el móvil de un cliente o una ruta del panel que reventaba se
// descubrían días después, cuando alguien se quejaba por WhatsApp.
//
// QUÉ HACE, de lo más simple a lo opcional:
//   1. Guarda los últimos 50 errores en Redis. El panel los enseña en
//      "Qué hacer hoy" y en la pestaña "Errores" (Mi tienda).
//   2. Si existe la variable ALERTAS_URL, además manda un aviso al instante.
//      Pensado para ntfy.sh, que es gratis y sin cuenta: se instala la app
//      ntfy en el teléfono, se suscribe a un tema con nombre difícil de
//      adivinar (p. ej. "eyd-alertas-7k2q9") y se pone en Vercel
//      ALERTAS_URL=https://ntfy.sh/eyd-alertas-7k2q9. Cualquier dirección que
//      acepte un POST de texto sirve igual.
//
// Para no llenar el teléfono si algo falla en bucle, se manda como mucho un
// aviso por tipo de error cada 30 minutos. En la lista se guardan todos.
//
// Nada de aquí puede romper la petición que falló: si avisar también falla,
// se calla.

import { hasDB, redisCmd } from './_store.js';
import { rateLimitRequest } from './_ratelimit.js';

const CLAVE = 'errores:recientes';
const CUANTOS = 50;

const corto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export async function avisarError(origen, mensaje, detalle = '') {
  const error = {
    fecha: new Date().toISOString(),
    origen: corto(origen, 80),
    mensaje: corto(mensaje, 300) || 'Error sin mensaje',
    detalle: String(detalle ?? '').slice(0, 1500),
  };

  if (hasDB) {
    try {
      await redisCmd(['LPUSH', CLAVE, JSON.stringify(error)]);
      await redisCmd(['LTRIM', CLAVE, '0', String(CUANTOS - 1)]);
    } catch { /* sin base no hay lista, pero el aviso al teléfono sigue */ }
  }

  const url = process.env.ALERTAS_URL;
  if (!url) return;
  // Un aviso por origen+mensaje cada 30 min (sin base, rateLimitRequest deja pasar).
  if (await rateLimitRequest(`alerta:${error.origen}:${error.mensaje.slice(0, 60)}`, 1, 1800)) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8', Title: 'Error en la tienda', Tags: 'warning' },
      body: `${error.origen}: ${error.mensaje}`,
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* el aviso es un extra: si no sale, el error sigue en la lista */ }
}

export async function listarErrores() {
  if (!hasDB) return [];
  const data = await redisCmd(['LRANGE', CLAVE, '0', String(CUANTOS - 1)]);
  return (data.result || [])
    .map((x) => {
      try {
        return JSON.parse(x);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function borrarErrores() {
  if (!hasDB) return;
  await redisCmd(['DEL', CLAVE]);
}
