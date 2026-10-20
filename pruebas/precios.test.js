// Pruebas de los invariantes de dinero.
//
// Cada una de estas corresponde a un fallo que YA OCURRIÓ en la tienda real y
// que costó dinero o confianza. No son ejercicios teóricos: si alguna se pone
// roja, es que ese fallo volvió.

import test from 'node:test';
import assert from 'node:assert/strict';

import { comprobarMontoEsperado, mejorTotal, vencida } from '../api/_ofertas-auto.js';
import { priceOrder } from '../api/_pricing.js';

// ---------------------------------------------------------------------------
// vencida(): las ofertas morían a las 7 de la tarde
//
// El servidor de Vercel corre en UTC y Lima va 5 horas por detrás. Con
// `new Date(fecha + 'T23:59:59')` el último día de cada oferta el descuento
// desaparecía a las 19:00 hora de Perú, mientras el navegador del cliente
// seguía mostrándolo: cinco horas con un precio en pantalla y el cobro
// rechazado por no cuadrar.
// ---------------------------------------------------------------------------
test('vencida: una oferta que termina hoy sigue viva a las 10 de la noche en Lima', () => {
  const real = Date.now;
  try {
    // 2026-08-02T03:00:00Z = 1 de agosto, 22:00 en Lima.
    Date.now = () => Date.parse('2026-08-02T03:00:00Z');
    assert.equal(vencida('2026-08-01'), false, 'la oferta del 1 de agosto debe seguir viva a las 22:00 de Lima');
  } finally {
    Date.now = real;
  }
});

test('vencida: la oferta muere al pasar la medianoche de Lima, no la de UTC', () => {
  const real = Date.now;
  try {
    // 2026-08-02T04:59:00Z = 1 de agosto, 23:59 en Lima -> todavía viva.
    Date.now = () => Date.parse('2026-08-02T04:59:00Z');
    assert.equal(vencida('2026-08-01'), false, 'a las 23:59 de Lima aún no vence');

    // 2026-08-02T05:30:00Z = 2 de agosto, 00:30 en Lima -> ya vencida.
    Date.now = () => Date.parse('2026-08-02T05:30:00Z');
    assert.equal(vencida('2026-08-01'), true, 'pasada la medianoche de Lima sí vence');
  } finally {
    Date.now = real;
  }
});

test('vencida: una fecha ilegible no bloquea la oferta', () => {
  assert.equal(vencida('vaya-fecha'), false);
  assert.equal(vencida(''), false);
});

// ---------------------------------------------------------------------------
// mejorTotal(): los descuentos no se suman, y nunca superan el total
// ---------------------------------------------------------------------------
test('mejorTotal: gana el descuento más grande, no la suma de los dos', () => {
  const r = mejorTotal(500, 50, 80);
  assert.equal(r.descuento, 80);
  assert.equal(r.total, 420);
  assert.equal(r.vieneDePromo, false, 'ganó el automático');
});

test('mejorTotal: si gana el código promocional, se marca como tal', () => {
  const r = mejorTotal(500, 120, 80);
  assert.equal(r.descuento, 120);
  assert.equal(r.total, 380);
  assert.equal(r.vieneDePromo, true);
});

test('mejorTotal: un cupón mal configurado no deja el total en negativo', () => {
  // Un cupón de S/ 500 sobre una compra de S/ 100 quedaba guardado como
  // "descuento de 500" y descuadraba las cuentas del panel.
  const r = mejorTotal(100, 500, 0);
  assert.equal(r.descuento, 100);
  assert.equal(r.total, 0);
});

test('mejorTotal: sin descuentos, el total no cambia', () => {
  const r = mejorTotal(449, 0, 0);
  assert.equal(r.descuento, 0);
  assert.equal(r.total, 449);
});

test('mejorTotal: los céntimos se redondean a dos decimales', () => {
  const r = mejorTotal(100, 0, 33.333);
  assert.equal(r.descuento, 33.33);
  assert.equal(r.total, 66.67);
});

// ---------------------------------------------------------------------------
// comprobarMontoEsperado(): nunca cobrar más de lo que vio el cliente
//
// La pantalla decía S/ 280 y a la tarjeta se le cobraban S/ 350. La página de
// gracias volvía a decir S/ 280, así que el cliente no se enteraba.
// ---------------------------------------------------------------------------
test('comprobarMontoEsperado: se rechaza cobrar más de lo mostrado', () => {
  const r = comprobarMontoEsperado(350, 280);
  assert.equal(r.ok, false);
  assert.match(r.error, /precio cambió/i);
});

test('comprobarMontoEsperado: cobrar MENOS está permitido (favorece al cliente)', () => {
  assert.equal(comprobarMontoEsperado(250, 280).ok, true);
});

test('comprobarMontoEsperado: un céntimo de diferencia por redondeo no bloquea la compra', () => {
  assert.equal(comprobarMontoEsperado(280.01, 280).ok, true);
  assert.equal(comprobarMontoEsperado(280.5, 280).ok, false, 'medio sol SÍ debe bloquear');
});

test('comprobarMontoEsperado: un navegador que no manda el total no bloquea la compra', () => {
  assert.equal(comprobarMontoEsperado(280, undefined).ok, true);
  assert.equal(comprobarMontoEsperado(280, 0).ok, true);
});

// ---------------------------------------------------------------------------
// priceOrder(): el precio lo pone el catálogo, nunca el navegador
// ---------------------------------------------------------------------------
const CATALOGO = [
  {
    id: 'milan',
    name: 'MILÁN',
    category: 'cabeceras',
    sizePricing: { '2plazas': 230, king: 410 },
  },
];

test('priceOrder: usa el precio del catálogo aunque el navegador mande otro', () => {
  const r = priceOrder(CATALOGO, [
    { productId: 'milan', sizeId: '2plazas', qty: 1, unitPrice: 1 },
  ]);
  assert.equal(r.total, 230, 'el "unitPrice: 1" que mandó el navegador se ignora');
  assert.equal(r.items[0].unitPrice, 230);
});

test('priceOrder: un producto que no existe no se puede comprar', () => {
  assert.equal(priceOrder(CATALOGO, [{ productId: 'inventado', sizeId: '2plazas', qty: 1 }]), null);
});

test('priceOrder: una medida sin precio no se puede comprar', () => {
  assert.equal(priceOrder(CATALOGO, [{ productId: 'milan', sizeId: 'queen', qty: 1 }]), null);
});

test('priceOrder: la cantidad se acota (no se aceptan 9999 unidades)', () => {
  const r = priceOrder(CATALOGO, [{ productId: 'milan', sizeId: '2plazas', qty: 9999 }]);
  assert.equal(r.items[0].qty, 20, 'el tope son 20 unidades');
  assert.equal(r.total, 230 * 20);
});

test('priceOrder: una cantidad negativa o cero pasa a ser 1', () => {
  assert.equal(priceOrder(CATALOGO, [{ productId: 'milan', sizeId: '2plazas', qty: -5 }]).total, 230);
  assert.equal(priceOrder(CATALOGO, [{ productId: 'milan', sizeId: '2plazas', qty: 0 }]).total, 230);
});

test('priceOrder: un carrito vacío no produce un pedido', () => {
  assert.equal(priceOrder(CATALOGO, []), null);
  assert.equal(priceOrder(CATALOGO, null), null);
});

// ---------------------------------------------------------------------------
// El recorrido completo: del carrito al importe que se cobra
// ---------------------------------------------------------------------------
test('de carrito a cobro: dos cabeceras King con 10% de descuento', () => {
  const pedido = priceOrder(CATALOGO, [{ productId: 'milan', sizeId: 'king', qty: 2 }]);
  assert.equal(pedido.total, 820);

  const conDescuento = mejorTotal(pedido.total, 0, 82); // 10%
  assert.equal(conDescuento.total, 738);

  // Lo que el navegador mostró coincide: la compra pasa.
  assert.equal(comprobarMontoEsperado(conDescuento.total, 738).ok, true);
  // Si la oferta hubiera vencido entre medias, el servidor cobraría 820 y se
  // rechaza en vez de cobrar de más.
  assert.equal(comprobarMontoEsperado(820, 738).ok, false);
});
