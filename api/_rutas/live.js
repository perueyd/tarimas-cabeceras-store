// La pestaña del live.
//
// Para qué sirve: el dueño hace transmisiones en vivo (TikTok, Instagram,
// Facebook) y quiere que quien lo está viendo entre a una página, deje su
// nombre y su WhatsApp, y vea al instante la oferta de ese live. Él la
// enciende y la apaga desde el panel, y se queda con la lista de registrados.
//
//   GET    público                -> si hay live y sus textos. NUNCA el código.
//   POST   público                -> registra a alguien y le entrega la oferta.
//   GET    admin                  -> la configuración completa y los registrados.
//   POST   admin ?accion=config   -> enciende, apaga o cambia el live.
//   DELETE admin ?whatsapp=9...   -> borra a una persona (derecho de cancelación).
//   DELETE admin ?todos=1         -> vacía la lista.
//
// DOS COSAS QUE NO SE PUEDEN ROMPER AQUÍ
//
// 1. El código de descuento solo sale DESPUÉS de registrarse. Si viajara en la
//    respuesta pública, cualquiera lo sacaría mirando la red del navegador y
//    el registro no serviría de nada.
// 2. El nombre y el WhatsApp son datos personales (Ley 29733): solo se guardan
//    con el consentimiento marcado, se pueden borrar uno a uno, y caducan
//    solos al año.

import { createHash, randomBytes } from 'crypto';
import { hasDB, redisCmd } from '../_store.js';
import { s } from '../_pricing.js';
import { checkAdminAuth } from '../_auth.js';
import { clientIp, rateLimitRequest } from '../_ratelimit.js';
import { listPromoCodes, usosDe } from '../_promo.js';
import { vencida } from '../_ofertas-auto.js';
import { normalizarNombre, normalizarWhatsApp, textoDeOferta } from '../../src/lib/live.js';

const CLAVE_CONFIG = 'live:config';
const CLAVE_LISTA = 'live:registrados';
const PREFIJO_VISTOS = 'live:vistos:';
const MAX_REGISTRADOS = 5000;
// Lo que promete la política de privacidad: los registros del live se guardan
// como mucho un año. Aquí es donde se cumple.
const DIAS_QUE_SE_GUARDAN = 365;
const SEGUNDOS_VISTOS = 7 * 24 * 3600;
// Tope de registros por visitante y hora. Es ALTO a propósito: en Perú los
// operadores móviles sacan a muchísimos clientes por la misma dirección de
// internet, y quien ve un live está casi siempre con datos del celular. Con
// un tope bajo (el de otros formularios es de 5 a 15) la mitad del público de
// una transmisión se quedaría sin poder registrarse. Sigue frenando a quien
// intente llenar la lista de registros falsos con un programa.
const REGISTROS_POR_HORA = 60;

const POR_DEFECTO = { activo: false, liveId: '', titulo: '', descripcion: '', proximo: '', codigo: '', encendido: '' };

async function leerConfig() {
  if (!hasDB) return { ...POR_DEFECTO };
  const data = await redisCmd(['GET', CLAVE_CONFIG]);
  if (!data?.result) return { ...POR_DEFECTO };
  try {
    return { ...POR_DEFECTO, ...JSON.parse(data.result) };
  } catch {
    return { ...POR_DEFECTO };
  }
}

// Lo único que puede ver cualquiera. Se arma campo por campo a propósito: si
// mañana se añade algo a la configuración, no sale al público por descuido.
function publico(config) {
  return {
    activo: Boolean(config.activo),
    liveId: config.activo ? config.liveId : '',
    titulo: config.titulo,
    descripcion: config.descripcion,
    proximo: config.proximo,
  };
}

// El cupón del live, solo si hoy se puede usar de verdad. Entregar un código
// vencido o agotado sería prometer un descuento que el pago va a rechazar.
async function cuponVigente(codigo) {
  if (!codigo) return null;
  const promo = (await listPromoCodes()).find((p) => p.code === codigo);
  if (!promo || !promo.activo) return null;
  if (promo.vence && vencida(promo.vence)) return null;
  if (promo.maxUsos) {
    const usados = Math.max(await usosDe(codigo), promo.usados || 0);
    if (usados >= promo.maxUsos) return null;
  }
  return promo;
}

async function leerRegistrados() {
  const data = await redisCmd(['LRANGE', CLAVE_LISTA, '0', String(MAX_REGISTRADOS - 1)]);
  return (data?.result || [])
    .map((crudo) => {
      try {
        return { crudo, ...JSON.parse(crudo) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// El número no se guarda tal cual en la marca de "ya se registró en este
// live": basta su huella para no apuntar dos veces a la misma persona.
function huella(liveId, whatsapp) {
  return createHash('sha256').update(`${liveId}:${whatsapp}`).digest('hex').slice(0, 20);
}

async function registrar(req, res) {
  if (await rateLimitRequest(`live:${clientIp(req)}`, REGISTROS_POR_HORA, 3600)) {
    return res.status(429).json({ error: 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.' });
  }
  if (!hasDB) return res.status(503).json({ error: 'El registro no está disponible en este momento.' });

  const body = req.body || {};
  const nombre = normalizarNombre(s(body.nombre, 120));
  const whatsapp = normalizarWhatsApp(s(body.whatsapp, 30));

  if (nombre.length < 2) return res.status(400).json({ error: 'Escribe tu nombre.' });
  if (!whatsapp) {
    return res.status(400).json({ error: 'Escribe tu número de WhatsApp: 9 dígitos y empieza con 9.' });
  }
  // Sin la casilla marcada no se guarda nada. Tiene que llegar un "sí"
  // explícito: un campo vacío o ausente no cuenta como consentimiento.
  if (body.acepta !== true) {
    return res.status(400).json({ error: 'Para registrarte tienes que aceptar el uso de tus datos.' });
  }

  const config = await leerConfig();
  if (!config.activo || !config.liveId) {
    return res.status(409).json({ error: 'El live ya terminó. Vuelve en la próxima transmisión.', terminado: true });
  }
  const promo = await cuponVigente(config.codigo);
  if (!promo) {
    return res.status(409).json({ error: 'La oferta de este live ya se agotó. ¡Atento al próximo!', terminado: true });
  }

  // SADD responde 1 solo la primera vez: quien recarga la página o vuelve a
  // enviar el formulario recibe su código otra vez, pero no ocupa dos filas.
  const claveVistos = PREFIJO_VISTOS + config.liveId;
  const nuevo = await redisCmd(['SADD', claveVistos, huella(config.liveId, whatsapp)]);
  if (nuevo?.result === 1) {
    await redisCmd(['EXPIRE', claveVistos, String(SEGUNDOS_VISTOS)]);
    const fila = {
      nombre,
      whatsapp,
      fecha: new Date().toISOString(),
      liveId: config.liveId,
      live: config.titulo,
      // Permiso APARTE para avisarle de otras ofertas. Sin él, el número solo
      // se puede usar para esta.
      promos: body.promos === true,
    };
    await redisCmd(['LPUSH', CLAVE_LISTA, JSON.stringify(fila)]);
    await redisCmd(['LTRIM', CLAVE_LISTA, '0', String(MAX_REGISTRADOS - 1)]);
  }

  return res.status(200).json({
    ok: true,
    codigo: promo.code,
    oferta: textoDeOferta(promo),
    vence: promo.vence || '',
    maxUsos: promo.maxUsos || null,
  });
}

async function guardarConfig(req, res) {
  const body = req.body || {};
  const anterior = await leerConfig();
  const codigo = s(body.codigo, 30).trim().toUpperCase().replace(/\s+/g, '');
  const activo = body.activo === true;

  if (activo) {
    if (!codigo) return res.status(400).json({ error: 'Elige el código de descuento de este live antes de encenderlo.' });
    if (!(await cuponVigente(codigo))) {
      return res.status(400).json({
        error: `El código ${codigo} no se puede usar ahora: no existe, está desactivado, venció o ya no le quedan usos. Revísalo en «Códigos de descuento».`,
      });
    }
  }

  const config = {
    activo,
    // Cada encendido es un live nuevo: quien se registró la semana pasada
    // puede registrarse otra vez en el de hoy.
    liveId: activo ? (anterior.activo && anterior.liveId ? anterior.liveId : randomBytes(6).toString('hex')) : '',
    titulo: s(body.titulo, 80).trim(),
    descripcion: s(body.descripcion, 300).trim(),
    proximo: s(body.proximo, 160).trim(),
    codigo,
    encendido: activo ? (anterior.activo && anterior.encendido ? anterior.encendido : new Date().toISOString()) : '',
  };
  await redisCmd(['SET', CLAVE_CONFIG, JSON.stringify(config)]);
  return res.status(200).json({ ok: true, config });
}

async function listar(res) {
  const config = await leerConfig();
  if (!hasDB) return res.status(200).json({ config, registrados: [] });

  const todos = await leerRegistrados();
  const limite = Date.now() - DIAS_QUE_SE_GUARDAN * 24 * 3600 * 1000;
  const vigentes = [];
  for (const fila of todos) {
    const cuando = new Date(fila.fecha).getTime();
    if (Number.isFinite(cuando) && cuando < limite) {
      // Pasó el año: se borra de la base, no solo de la pantalla.
      await redisCmd(['LREM', CLAVE_LISTA, '0', fila.crudo]).catch(() => {});
      continue;
    }
    const { crudo: _crudo, ...limpia } = fila;
    vigentes.push(limpia);
  }
  return res.status(200).json({ config, registrados: vigentes });
}

async function borrar(req, res) {
  if (req.query.todos === '1') {
    await redisCmd(['DEL', CLAVE_LISTA]);
    return res.status(200).json({ ok: true, borrados: 'todos' });
  }
  const whatsapp = normalizarWhatsApp(s(req.query.whatsapp, 30));
  if (!whatsapp) return res.status(400).json({ error: 'Falta el número a borrar.' });

  // Se borra por VALOR, nunca por posición: la lista crece por delante con
  // cada registro, y un índice leído hace un momento ya apunta a otra persona.
  let borrados = 0;
  for (const fila of await leerRegistrados()) {
    if (fila.whatsapp !== whatsapp) continue;
    await redisCmd(['LREM', CLAVE_LISTA, '0', fila.crudo]);
    borrados += 1;
  }
  return res.status(200).json({ ok: true, borrados });
}

export default async function handler(req, res) {
  const esConfig = req.method === 'POST' && s(req.query.accion, 20) === 'config';

  if (req.method === 'POST' && !esConfig) return registrar(req, res);

  // La consulta pública es la que NO trae clave. Con clave (el panel) se
  // devuelve todo; sin ella, solo lo que cualquiera puede ver.
  if (req.method === 'GET' && !req.headers.authorization) {
    return res.status(200).json(publico(await leerConfig()));
  }

  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') return listar(res);

  if (!hasDB) {
    return res.status(501).json({
      error: 'Base de datos no conectada. Conecta la integración gratuita "Upstash Redis" en Vercel para usar el live.',
    });
  }
  if (esConfig) return guardarConfig(req, res);
  if (req.method === 'DELETE') return borrar(req, res);

  return res.status(405).json({ error: 'Método no permitido' });
}
