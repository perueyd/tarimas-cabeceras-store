// Contador de visitas propio.
//
// POR QUÉ EXISTE: el dueño no tenía forma de saber si entraba alguien a su
// tienda. Google Analytics está programado pero nunca se configuró, así que
// llevaba meses a ciegas: sin saber si las fotos que subía servían de algo, ni
// qué cabecera miraba la gente, ni si el dinero en anuncios traía a alguien.
//
// SE HIZO AQUÍ EN VEZ DE USAR UN TERCERO porque así:
//   · es gratis para siempre, sin límite de eventos ni plan de pago;
//   · los datos no salen de su propia base;
//   · NO hace falta el consentimiento de cookies, porque no se guarda nada de
//     la persona — ni IP, ni identificador, ni cookie. Solo se suma 1 a un
//     contador. Eso no es un dato personal, así que la Ley 29733 no aplica y
//     el visitante no tiene que aceptar nada para que cuente.
//
// LO QUE NO HACE, a propósito: distinguir visitantes únicos. Para eso habría
// que marcar a cada persona de alguna forma, y entonces sí serían datos
// personales. Se cuentan visitas, no personas, y el panel lo dice con todas
// las letras en vez de hacerlo pasar por otra cosa.
//
// POST público -> suma una visita (lo llama la tienda al cargar)
// GET  admin   -> el resumen para el panel

import { hasDB, redisCmd } from '../_store.js';
import { checkAdminAuth } from '../_auth.js';
import { s } from '../_pricing.js';
import { clientIp, rateLimitRequest } from '../_ratelimit.js';
import { diaLima } from '../../src/lib/lima.js';
import { SITIO } from '../_sitio.js';

const DIAS_QUE_SE_GUARDAN = 90;
const SEGUNDOS_90_DIAS = DIAS_QUE_SE_GUARDAN * 24 * 60 * 60;

// El día en hora de Lima: sin esto, todo lo que pasara después de las 7 de la
// tarde contaría como del día siguiente y los números no cuadrarían con lo que
// el dueño ve en su día. La cuenta vive en src/lib/lima.js.

const claveDia = (dia) => `visitas:${dia}`;

// De dónde llegó la visita, en una palabra. No se guarda la dirección completa
// de origen: con el dominio basta para saber si el esfuerzo en Instagram sirve,
// y guardar menos es siempre mejor.
//
// Revisado el 28/11/2026 (el dueño preguntó qué era «l.wl.co»):
//  · l.wl.co es el enlace de salida de WhatsApp: cuenta como WhatsApp.
//  · La tienda se reconocía a sí misma solo con «www»: la navegación interna
//    salía como «corporacionagamenon.com». Ahora se comparan sin «www», y las
//    direcciones antiguas (*.vercel.app de la tienda) también son internas.
//  · vercel.com son el dueño o las pruebas abriendo la tienda desde Vercel.
const DOMINIOS_PROPIOS = [
  'corporacionagamenon.com',
  'corporacionagamenon.vercel.app',
  'eydperu.vercel.app',
  'tarimas-cabeceras-store.vercel.app',
];

// Las apps de Instagram, TikTok y WhatsApp casi nunca dicen de dónde viene la
// visita, así que salen como «directo». Para saberlo, el dueño comparte la
// dirección con ?origen=instagram (o facebook, tiktok, whatsapp...). Solo se
// aceptan estos valores: nada que escriba un tercero llega al panel.
export const ORIGENES_MARCADOS = ['instagram', 'facebook', 'tiktok', 'whatsapp', 'google', 'youtube', 'qr'];

export function origenDe(referrer, propioHost, marcado = '') {
  const m = String(marcado || '').toLowerCase().trim();
  if (ORIGENES_MARCADOS.includes(m)) return m;
  if (!referrer) return 'directo';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return origenDeDominio(host, String(propioHost || '').replace(/^www\./, ''));
  } catch {
    return 'directo';
  }
}

/** Un dominio, en la palabra con que se guarda. También ordena lo guardado antes. */
export function origenDeDominio(dominio, propio = 'corporacionagamenon.com') {
  const host = String(dominio || '').replace(/^www\./, '');
  if (!host || host === propio || DOMINIOS_PROPIOS.includes(host)) return 'interno';
  if (/google\./.test(host)) return 'google';
  if (/facebook\.|fb\.me|fb\.com/.test(host)) return 'facebook';
  if (/instagram\./.test(host)) return 'instagram';
  if (/tiktok\./.test(host)) return 'tiktok';
  if (/whatsapp|wa\.me|(^|\.)wl\.co$/.test(host)) return 'whatsapp';
  if (/youtube\.|youtu\.be/.test(host)) return 'youtube';
  if (/bing\.|duckduckgo\.|yahoo\./.test(host)) return 'otro buscador';
  if (host === 'vercel.com') return 'vercel';
  return host.slice(0, 40);
}

// Lo que ya estaba guardado con el nombre del dominio se ordena al leerlo con
// las mismas reglas (l.wl.co → whatsapp, el propio dominio → interno...).
const PALABRAS = new Set(['directo', 'interno', 'otro buscador', 'vercel', ...ORIGENES_MARCADOS]);
const reordenarOrigen = (k) => (PALABRAS.has(k) ? k : origenDeDominio(k));

// La ruta se recorta a algo contable: una ficha de producto se guarda como
// "/producto/milan", pero cualquier cosa rara se descarta. Sin esto, un bot
// pidiendo direcciones inventadas llenaría el contador de basura.
function rutaLimpia(ruta) {
  const r = s(ruta, 120).split('?')[0].split('#')[0];
  if (!r.startsWith('/')) return null;
  if (!/^[\w\-/.%áéíóúñÁÉÍÓÚÑ]*$/.test(r)) return null;
  return r === '' ? '/' : r;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (!hasDB) return res.status(200).json({ ok: false });

    // Un tope por IP para que nadie infle los números recargando. La IP se usa
    // SOLO para esto y no se guarda en ningún sitio: el limitador la convierte
    // en una clave temporal que caduca sola.
    if (await rateLimitRequest(`visita:${clientIp(req)}`, 60, 3600)) {
      return res.status(200).json({ ok: false });
    }

    const ruta = rutaLimpia(req.body?.ruta);
    if (!ruta) return res.status(200).json({ ok: false });

    const origen = origenDe(s(req.body?.desde, 300), new URL(SITIO).host, s(req.body?.origen, 20));
    const clave = claveDia(diaLima());

    try {
      await redisCmd(['HINCRBY', clave, 'total', '1']);
      await redisCmd(['HINCRBY', clave, `ruta:${ruta}`, '1']);
      await redisCmd(['HINCRBY', clave, `desde:${origen}`, '1']);
      // Los contadores se borran solos a los 90 días: ni ocupan sitio para
      // siempre ni guardan un historial que nadie va a mirar.
      await redisCmd(['EXPIRE', clave, String(SEGUNDOS_90_DIAS)]).catch(() => {});
    } catch {
      // Contar visitas nunca puede romper la tienda. Si falla, se pierde esa
      // visita y ya está.
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const auth = await checkAdminAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    if (!hasDB) return res.status(501).json({ error: 'Base de datos no conectada.' });

    const dias = Math.min(Math.max(parseInt(s(req.query.dias, 4), 10) || 30, 1), 90);
    const hoy = new Date();
    const fechas = [];
    for (let i = 0; i < dias; i++) {
      fechas.push(diaLima(new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000)));
    }

    const porDia = [];
    const rutas = {};
    const origenes = {};
    let total = 0;

    for (const dia of fechas) {
      let campos = {};
      try {
        const data = await redisCmd(['HGETALL', claveDia(dia)]);
        campos = normalizarHash(data?.result);
      } catch {
        campos = {};
      }
      const delDia = Number(campos.total || 0);
      total += delDia;
      porDia.push({ dia, visitas: delDia });

      for (const [campo, valor] of Object.entries(campos)) {
        const n = Number(valor) || 0;
        if (campo.startsWith('ruta:')) rutas[campo.slice(5)] = (rutas[campo.slice(5)] || 0) + n;
        else if (campo.startsWith('desde:')) {
          const o = reordenarOrigen(campo.slice(6));
          origenes[o] = (origenes[o] || 0) + n;
        }
      }
    }

    const ordenar = (obj) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([nombre, visitas]) => ({ nombre, visitas }));

    return res.status(200).json({
      ok: true,
      dias,
      total,
      porDia: porDia.reverse(), // del más viejo al más nuevo, para la gráfica
      rutas: ordenar(rutas),
      origenes: ordenar(origenes),
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

// Upstash devuelve los hash como lista plana [campo, valor, campo, valor...];
// la base local los devuelve como objeto. Se acepta cualquiera de las dos.
function normalizarHash(result) {
  if (!result) return {};
  if (Array.isArray(result)) {
    const obj = {};
    for (let i = 0; i < result.length; i += 2) obj[result[i]] = result[i + 1];
    return obj;
  }
  return typeof result === 'object' ? result : {};
}
