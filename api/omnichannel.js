// Omnichannel: Sincroniza ofertas en WhatsApp, Instagram, TikTok
// Un código en 3 plataformas simultáneamente

import { hasDB, redisCmd } from './_store.js';
import { checkAdminAuth } from './_auth.js';

const KEY_CANALES = 'omnichannel:canales';

async function listarCanales() {
  if (!hasDB) return [];
  const data = await redisCmd(['GET', KEY_CANALES]);
  if (!data.result) return [];
  try {
    return JSON.parse(data.result);
  } catch {
    return [];
  }
}

async function guardarCanales(list) {
  if (!hasDB) return false;
  await redisCmd(['SET', KEY_CANALES, JSON.stringify(list)]);
  return true;
}

// Broadcast: enviar oferta a todos los canales
export async function broadcastOferta(oferta, mensaje) {
  try {
    const canales = await listarCanales();

    const campana = {
      id: `campana-${Date.now()}`,
      oferta,
      mensaje,
      enviados: {
        whatsapp: 0,
        instagram: 0,
        tiktok: 0,
      },
      creado: new Date().toISOString(),
    };

    // Enviar a WhatsApp (via Twilio)
    if (canales.find((c) => c.tipo === 'whatsapp' && c.activo)) {
      // En producción: llamar API de Twilio
      campana.enviados.whatsapp = Math.random() * 100; // Simulado
    }

    // Enviar a Instagram (via Meta Business API)
    if (canales.find((c) => c.tipo === 'instagram' && c.activo)) {
      // En producción: llamar Instagram API
      campana.enviados.instagram = Math.random() * 50; // Simulado
    }

    // Enviar a TikTok (via TikTok Shop API)
    if (canales.find((c) => c.tipo === 'tiktok' && c.activo)) {
      // En producción: llamar TikTok API
      campana.enviados.tiktok = Math.random() * 30; // Simulado
    }

    return campana;
  } catch (err) {
    console.error('Error en broadcast:', err);
    return null;
  }
}

// Sincronizar ofertas: mismo código en todos lados
export async function sincronizarOferta(codigoOferta, canales) {
  return {
    codigo: codigoOferta,
    whatsapp: `${codigoOferta} 👉 https://wa.me/51951278010`,
    instagram: `${codigoOferta} en Stories (link en bio)`,
    tiktok: `${codigoOferta} en video (link en bio)`,
    creado: new Date().toISOString(),
  };
}

// Handler API
export default async function handler(req, res) {
  const auth = await checkAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    const canales = await listarCanales();
    return res.status(200).json({ canales });
  }

  if (req.method === 'POST') {
    // POST - crear/actualizar canal
    const { tipo, nombre, activo, credenciales } = req.body;
    if (!tipo) return res.status(400).json({ error: 'Falta tipo de canal' });

    const canales = await listarCanales();
    const canal = {
      id: `canal-${tipo}-${Date.now()}`,
      tipo, // whatsapp, instagram, tiktok
      nombre,
      activo: activo !== false,
      credenciales: credenciales || {},
      creado: new Date().toISOString(),
    };

    canales.push(canal);
    await guardarCanales(canales);

    return res.status(200).json({ ok: true, canal });
  }

  if (req.method === 'PUT') {
    // PUT - broadcast oferta
    const { oferta, mensaje } = req.body;
    const campana = await broadcastOferta(oferta, mensaje);
    return res.status(200).json({ ok: true, campana });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
