// Autenticación del panel de administrador — usada por todos los endpoints
// protegidos (catalog, orders, promo, reviews, reclamos, upload).
//
// Dos mejoras sobre comparar el string directo:
// 1. Comparación en tiempo constante (evita que alguien deduzca la clave
//    caracter por caracter midiendo cuánto tarda la respuesta).
// 2. Límite de intentos fallidos por IP (evita fuerza bruta contra la
//    clave). Solo cuenta los intentos FALLIDOS, así el uso normal del
//    panel (muchas peticiones válidas seguidas) nunca se ve afectado.
//
// La clave se acepta de dos formas: cabecera "Authorization: Bearer XXX"
// (la que usa el panel ahora) o "?key=XXX" en la URL (se mantiene por
// compatibilidad, pero ya no se usa desde el frontend — una clave en la URL
// puede quedar en logs del servidor).
import { createHash, timingSafeEqual } from 'crypto';
import { bump, clientIp, isOverLimit } from './_ratelimit.js';

const MAX_INTENTOS_FALLIDOS = 20;
const VENTANA_SEGUNDOS = 300; // 5 minutos

function getProvidedKey(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return String(req.query?.key || '');
}

function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

// Devuelve { ok: true } o { ok: false, status, error } listo para responder.
export async function checkAdminAuth(req) {
  const adminKey = process.env.ORDERS_ADMIN_KEY;
  const rlKey = `auth-fail:${clientIp(req)}`;

  if (await isOverLimit(rlKey, MAX_INTENTOS_FALLIDOS)) {
    return { ok: false, status: 429, error: 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.' };
  }
  if (!adminKey) {
    return { ok: false, status: 401, error: 'Clave incorrecta.' };
  }

  const provided = getProvidedKey(req);
  if (!provided || !safeEqual(provided, adminKey)) {
    await bump(rlKey, VENTANA_SEGUNDOS);
    return { ok: false, status: 401, error: 'Clave incorrecta.' };
  }
  return { ok: true };
}
