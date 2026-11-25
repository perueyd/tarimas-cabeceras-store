// Lo que CHAT-ED sabe de plazos de entrega y formas de pago.
//
// El fallo que evita (19/11/2026): en «Pruébalo» del panel, a «¿En cuánto
// llega a Surco?» CHAT-ED contestó la regla de las cabeceras para todo («si
// pides antes de las 8 a. m., te lo llevamos ese mismo día desde las 5 p. m.»)
// porque la sacaba de una pregunta frecuente escrita a mano. Y otra pregunta
// frecuente seguía diciendo «aceptamos tarjeta» con la tarjeta apagada. Ahora
// los dos datos salen de la misma configuración que usa el pago.

import test from 'node:test';
import assert from 'node:assert/strict';

// --- Base de mentira (antes de importar el código: lo lee al cargar) --------
process.env.UPSTASH_REDIS_REST_URL = 'https://redis.prueba.local';
process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
const db = new Map();
globalThis.fetch = async (url, opts = {}) => {
  const [cmd, key, ...args] = JSON.parse(opts.body || '[]');
  const result = cmd === 'MGET' ? [key, ...args].map((k) => db.get(k) ?? null) : cmd === 'GET' ? db.get(key) ?? null : null;
  return { ok: true, json: async () => ({ result }) };
};
const { construirConocimiento } = await import('../api/_bot-conocimiento.js');

const producto = (id, category) => ({ id, category, name: id, sizePricing: { s: 100 } });

test('CHAT-ED dice el plazo de cada tipo de producto y solo las formas de pago activas', async () => {
  db.set('catalog:products', JSON.stringify([producto('viena', 'cabeceras'), producto('clasica', 'tarimas'), producto('ortopedico', 'colchones')]));
  db.set('catalog:categories', JSON.stringify([
    { id: 'tarimas', label: 'Tarimas' },
    { id: 'cabeceras', label: 'Cabeceras' },
    { id: 'colchones', label: 'Colchones' },
    { id: 'salas', label: 'Salas' },
  ]));
  db.set('catalog:sizes', JSON.stringify([{ id: 's', label: '2 plazas' }]));
  db.set('catalog:config', JSON.stringify({
    paymentMethods: { culqi: false, yapePlin: true, transferencia: true, contraEntrega: true },
    faq: [
      { q: '¿Cuánto demora la entrega?', a: 'Si pides hasta las 8 a. m. te lo llevamos hoy desde las 5 p. m.' },
      { q: '¿Cómo puedo pagar?', a: 'Aceptamos Yape/Plin, transferencia bancaria y tarjeta.' },
      { q: '¿Cuánto cuesta el envío?', a: 'Gratis en Lima Metropolitana.' },
    ],
  }));

  const texto = await construirConocimiento();
  const plazos = texto.slice(texto.indexOf('PLAZOS DE ENTREGA'), texto.indexOf('FORMAS DE PAGO'));
  assert.match(plazos, /vale ESTA/, 'tiene que mandar sobre una pregunta frecuente antigua');
  assert.match(plazos, /- CABECERAS: pedido hasta las 8 a\. m\. → se entrega HOY desde las 5 p\. m\. \(seguro\).*de 1 a 3 días más/);
  assert.match(plazos, /- TARIMAS: pedido hasta las 8 a\. m\. → se entrega HOY desde las 5 p\. m\./, 'la tarima sigue el plan de la cabecera (25/11/2026)');
  assert.match(plazos, /- COLCHONES: NO hay entrega el mismo día · se entrega a los 2 días/, 'el colchón tiene su propio plazo');
  assert.match(plazos, /preguntan por el TIEMPO de entrega, no por el precio/);
  assert.doesNotMatch(plazos, /Salas/, 'un tipo sin productos a la venta no se menciona');

  const pagos = texto.slice(texto.indexOf('FORMAS DE PAGO'), texto.indexOf('FORMAS DE PAGO') + 200);
  assert.doesNotMatch(pagos, /tarjeta/i, 'con la tarjeta apagada, CHAT-ED no puede ofrecerla');
  assert.match(pagos, /Yape, Plin/);
  assert.match(pagos, /contra entrega/);

  // Las preguntas frecuentes viejas no pueden contradecir lo oficial: en la
  // prueba real, CHAT-ED le dio a una tarima «desde las 5 p. m.» por esto.
  assert.doesNotMatch(texto, /te lo llevamos hoy desde las 5 p\. m\./, 'la pregunta frecuente vieja de plazos sigue llegando a CHAT-ED');
  assert.doesNotMatch(texto, /Aceptamos Yape\/Plin, transferencia bancaria y tarjeta/, 'con la tarjeta apagada, la pregunta que la ofrece sigue llegando');
  assert.match(texto, /¿Cuánto cuesta el envío\?/, 'las demás preguntas frecuentes se quedan');
});

// Correo de ventas corporativas (pedido del dueño, 22/11/2026).
// El fallo que evita: el contacto guardado en el panel es de antes y no trae
// este dato; al mezclarlo con el de fábrica se tapaba entero y el correo no
// salía en ninguna parte hasta que el dueño volviera a guardar.
test('CHAT-ED da el correo de ventas corporativas aunque el contacto guardado sea antiguo', async () => {
  const { correoCorporativo } = await import('../src/lib/contacto.js');
  db.set('catalog:products', JSON.stringify([producto('viena', 'cabeceras')]));
  db.set('catalog:categories', JSON.stringify([{ id: 'cabeceras', label: 'Cabeceras' }]));
  db.set('catalog:config', JSON.stringify({ contacto: { whatsapp: '51951278010', telefonoFormato: '951 278 010', email: '' } }));
  assert.match(await construirConocimiento(), /Ventas corporativas \(empresas, compras por volumen, con factura\): corporacionagamenon@gmail\.com/);

  // Si el dueño lo borra en el panel, desaparece; y uno mal escrito no se enseña.
  db.set('catalog:config', JSON.stringify({ contacto: { whatsapp: '51951278010', correoCorporativo: '' } }));
  assert.doesNotMatch(await construirConocimiento(), /Ventas corporativas/);
  assert.equal(correoCorporativo({ contacto: { correoCorporativo: 'ventas@empresa' } }), '');
  assert.equal(correoCorporativo({ contacto: { correoCorporativo: ' Ventas@Empresa.PE ' } }), 'ventas@empresa.pe');
});
