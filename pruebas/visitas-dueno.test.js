// El contador de visitas no tiene que contar al dueño ni a los navegadores
// automáticos. En noviembre de 2026 solo se le reconocía en la misma pestaña
// del panel: sus pruebas desde el celular y las revisiones automáticas de la
// tienda inflaron la gráfica de visitas (lo preguntó el dueño, 28/11/2026).
import test from 'node:test';
import assert from 'node:assert/strict';

function almacen() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
let enviados = 0;
globalThis.sessionStorage = almacen();
globalThis.localStorage = almacen();
Object.defineProperty(globalThis, 'navigator', { value: { sendBeacon: () => { enviados++; return true; }, webdriver: false }, configurable: true });
globalThis.document = { referrer: '' };
globalThis.Blob = class { constructor() {} };

const { contarVisita, NO_CONTAR } = await import('../src/lib/visitas.js');
const { guardarClave } = await import('../src/pages/panel/sesion.js');

test('un visitante normal sí cuenta', () => {
  enviados = 0;
  contarVisita('/tienda');
  assert.equal(enviados, 1);
});

test('el aparato donde el dueño entró al panel ya no cuenta, aunque cierre esa pestaña', () => {
  guardarClave('clave-de-prueba');
  sessionStorage.removeItem('ed-orders-key'); // cerró la pestaña del panel
  assert.equal(localStorage.getItem(NO_CONTAR), '1');
  assert.notEqual(localStorage.getItem(NO_CONTAR), 'clave-de-prueba', 'la marca no es la clave');
  enviados = 0;
  contarVisita('/producto/milan');
  assert.equal(enviados, 0);
  localStorage.removeItem(NO_CONTAR);
});

test('un navegador automático no cuenta', () => {
  navigator.webdriver = true;
  enviados = 0;
  contarVisita('/carrito');
  assert.equal(enviados, 0);
  navigator.webdriver = false;
});
