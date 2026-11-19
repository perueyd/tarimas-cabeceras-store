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
    faq: [{ q: '¿Cuánto demora la entrega?', a: 'Si pides hasta las 8 a. m. te lo llevamos hoy desde las 5 p. m.' }],
  }));

  const texto = await construirConocimiento();
  const plazos = texto.slice(texto.indexOf('PLAZOS DE ENTREGA'), texto.indexOf('FORMAS DE PAGO'));
  assert.match(plazos, /vale ESTA/, 'tiene que mandar sobre una pregunta frecuente antigua');
  assert.match(plazos, /- Cabeceras: Pídelo hasta las 8 a\. m\..*de 1 a 3 días más/);
  assert.match(plazos, /- Tarimas: Pídelo hasta las 9 a\. m\. y, según la disponibilidad del taller/);
  assert.match(plazos, /- Colchones: /, 'lo que no tiene regla propia sale con la general');
  assert.doesNotMatch(plazos, /Salas/, 'un tipo sin productos a la venta no se menciona');

  const pagos = texto.slice(texto.indexOf('FORMAS DE PAGO'), texto.indexOf('FORMAS DE PAGO') + 200);
  assert.doesNotMatch(pagos, /tarjeta/i, 'con la tarjeta apagada, CHAT-ED no puede ofrecerla');
  assert.match(pagos, /Yape, Plin/);
  assert.match(pagos, /contra entrega/);
});
