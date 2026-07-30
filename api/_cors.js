// Validación CORS básica: asegura que las requests vengan del mismo origen
// Previene CSRF attacks desde sitios maliciosos
import { clientIp } from './_ratelimit.js';

export function validateOrigin(req) {
  const origin = req.headers.origin || req.headers.referer;
  const allowedOrigins = [
    'https://eydperu.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  // Permitir requests sin origin (API calls directas, o curl)
  if (!origin) return true;

  // Validar que el origin sea permitido
  const baseOrigin = new URL(origin).origin;
  return allowedOrigins.includes(baseOrigin);
}

export function setCorsHeaders(res) {
  // No agregamos Access-Control-Allow headers (no necesitamos CORS cross-origin)
  // El sitio está en Vercel, el API también → mismo origen siempre
  // Esto es más seguro que abrir CORS al mundo
}

export function corsMiddleware(req, res) {
  if (!validateOrigin(req)) {
    return res.status(403).json({
      error: 'Origen no permitido',
      ip: clientIp(req),
    });
  }

  // Si pasa validación, agregar headers de seguridad
  setCorsHeaders(res);
  return null;
}
