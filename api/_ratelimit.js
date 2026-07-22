// Límite de tasa simple (ventana fija) usando Redis — protege endpoints
// públicos contra abuso (spam, fuerza bruta, prueba de tarjetas robadas).
// Si Redis no está conectado, no limita nada: es mejor dejar pasar tráfico
// que romper la tienda por falta de base de datos (mismo criterio que el
// resto del sitio).
import { hasDB, redisCmd } from './_store.js';

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Lee el contador actual de una clave sin sumarle un intento.
export async function getCount(key) {
  if (!hasDB) return 0;
  try {
    const data = await redisCmd(['GET', `ratelimit:${key}`]);
    return Number(data.result) || 0;
  } catch {
    return 0;
  }
}

// Suma un intento a la ventana; crea la ventana con expiración en el primero.
export async function bump(key, windowSeconds) {
  if (!hasDB) return;
  try {
    const redisKey = `ratelimit:${key}`;
    const data = await redisCmd(['INCR', redisKey]);
    if (data.result === 1) await redisCmd(['EXPIRE', redisKey, String(windowSeconds)]);
  } catch {
    // Si Redis falla a mitad de camino, no se bloquea al cliente por eso.
  }
}

// true si la clave YA superó el límite (no cuenta este intento como nuevo).
export async function isOverLimit(key, limit) {
  return (await getCount(key)) >= limit;
}

// Para endpoints públicos: suma este intento y avisa si hay que rechazarlo.
// Cuenta TODOS los intentos (no solo los fallidos) — a diferencia del
// límite de autenticación, aquí no hay un "éxito" que deba excluirse.
export async function rateLimitRequest(key, limit, windowSeconds) {
  if (!hasDB) return false;
  try {
    const redisKey = `ratelimit:${key}`;
    const data = await redisCmd(['INCR', redisKey]);
    const count = Number(data.result) || 0;
    if (count === 1) await redisCmd(['EXPIRE', redisKey, String(windowSeconds)]);
    return count > limit;
  } catch {
    return false;
  }
}
