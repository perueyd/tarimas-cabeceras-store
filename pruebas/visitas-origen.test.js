// De dónde llegan las visitas. El dueño preguntó qué era «l.wl.co» (28/11/2026):
// era WhatsApp sin reconocer; y la navegación dentro de la propia tienda salía
// como si viniera de «corporacionagamenon.com» por culpa del «www».
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.UPSTASH_REDIS_REST_URL = '';
const { origenDe, origenDeDominio } = await import('../api/_rutas/visitas.js');
const PROPIO = 'www.corporacionagamenon.com';

test('el enlace de salida de WhatsApp (l.wl.co) cuenta como WhatsApp', () => {
  assert.equal(origenDe('https://l.wl.co/l?u=x', PROPIO), 'whatsapp');
  assert.equal(origenDeDominio('l.wl.co'), 'whatsapp');
});

test('la propia tienda, con o sin www y con sus direcciones antiguas, es navegación interna', () => {
  assert.equal(origenDe('https://corporacionagamenon.com/tienda', PROPIO), 'interno');
  assert.equal(origenDe('https://www.corporacionagamenon.com/', PROPIO), 'interno');
  assert.equal(origenDeDominio('eydperu.vercel.app'), 'interno');
});

test('?origen= solo acepta las redes conocidas', () => {
  assert.equal(origenDe('', PROPIO, 'instagram'), 'instagram');
  assert.equal(origenDe('', PROPIO, 'TikTok'), 'tiktok');
  assert.equal(origenDe('', PROPIO, '<script>'), 'directo', 'lo que no es una red conocida no llega al panel');
  assert.equal(origenDe('', PROPIO), 'directo');
});
