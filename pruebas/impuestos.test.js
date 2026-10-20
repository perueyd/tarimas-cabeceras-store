// Pruebas de las cuentas de IGV, renta y margen.
//
// Estas importan más que casi todas las demás: un céntimo mal aquí es una
// declaración mal presentada ante la SUNAT, y el error más fácil de cometer
// (sacar el 18% del total en vez de separarlo) infla el IGV un 18% entero.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TASA_IGV,
  UIT,
  agregarIGV,
  avisoLimiteRenta,
  esVentaConfirmada,
  mesDeLima,
  resumenPorMes,
  resumirMes,
  separarIGV,
} from '../api/_impuestos.js';

// ---------------------------------------------------------------------------
// Separar el IGV de un precio que ya lo incluye
// ---------------------------------------------------------------------------
test('separarIGV: una cabecera Queen de S/ 310', () => {
  const r = separarIGV(310);
  assert.equal(r.base, 262.71);
  assert.equal(r.igv, 47.29);
  assert.equal(r.total, 310);
});

test('separarIGV: el IGV NO es el 18% del total (el error clásico)', () => {
  const r = separarIGV(310);
  const malCalculado = Math.round(310 * TASA_IGV * 100) / 100; // 55.80
  assert.notEqual(r.igv, malCalculado);
  assert.ok(r.igv < malCalculado, 'separar siempre da menos que aplicar el 18% encima');
  // Lo que se declararía de más si se hiciera mal:
  assert.equal(Math.round((malCalculado - r.igv) * 100) / 100, 8.51);
});

test('separarIGV: base + IGV siempre da exactamente el total', () => {
  // Importes elegidos para forzar redondeos feos.
  for (const total of [0.01, 1, 9.99, 100, 220, 230, 310, 410, 749, 1234.56, 99999.99]) {
    const r = separarIGV(total);
    assert.equal(
      Math.round((r.base + r.igv) * 100) / 100,
      total,
      `base + igv debe dar ${total}`
    );
  }
});

test('separarIGV: cero y basura no rompen nada', () => {
  assert.deepEqual(separarIGV(0), { base: 0, igv: 0, total: 0 });
  assert.deepEqual(separarIGV(-5), { base: 0, igv: 0, total: 0 });
  assert.deepEqual(separarIGV(undefined), { base: 0, igv: 0, total: 0 });
});

test('agregarIGV es el camino contrario de separarIGV', () => {
  const conIgv = agregarIGV(262.71);
  assert.equal(conIgv.total, 310);
  assert.equal(separarIGV(conIgv.total).base, 262.71);
});

// ---------------------------------------------------------------------------
// Qué pedidos cuentan como venta
// ---------------------------------------------------------------------------
test('un pedido por verificar NO se declara todavía', () => {
  assert.equal(esVentaConfirmada({ estado: 'Pago por verificar' }), false);
  assert.equal(esVentaConfirmada({ estado: 'Cancelado' }), false);
  assert.equal(esVentaConfirmada({ estado: 'Pagado' }), true);
  assert.equal(esVentaConfirmada({ estado: 'Entregado' }), true);
});

test('el mes se calcula en hora de Lima, no en UTC', () => {
  // 1 de noviembre a las 02:00 UTC = 31 de OCTUBRE a las 21:00 en Lima.
  // Con UTC esta venta se iría al mes siguiente y la declaración no cuadraría.
  assert.equal(mesDeLima('2026-11-01T02:00:00Z'), '2026-10');
  assert.equal(mesDeLima('2026-11-01T06:00:00Z'), '2026-11'); // 01:00 de Lima
  assert.equal(mesDeLima('fecha mala'), null);
});

// ---------------------------------------------------------------------------
// El resumen del mes
// ---------------------------------------------------------------------------
const pedido = (monto, estado, items = []) => ({
  monto,
  estado,
  fecha: '2026-10-15T15:00:00Z',
  items,
});

test('resumirMes: solo suma lo cobrado de verdad', () => {
  const r = resumirMes([
    pedido(310, 'Pagado'),
    pedido(410, 'Entregado'),
    pedido(1000, 'Pago por verificar'), // no cuenta
    pedido(500, 'Cancelado'), // no cuenta
  ]);
  assert.equal(r.pedidos, 2);
  assert.equal(r.total, 720);
  assert.equal(r.base, 610.17);
  assert.equal(r.igv, 109.83);
});

test('resumirMes: la renta del 1% se calcula sobre la base, no sobre el total', () => {
  const r = resumirMes([pedido(1180, 'Pagado')]);
  assert.equal(r.base, 1000);
  assert.equal(r.igv, 180);
  assert.equal(r.renta, 10, '1% de 1000, no de 1180');
  assert.equal(r.aLaSunat, 190);
});

test('resumirMes: el margen usa la base, porque el IGV nunca fue suyo', () => {
  const items = [{ productId: 'milan', sizeId: 'queen', qty: 1 }];
  const r = resumirMes([pedido(310, 'Pagado', items)], { 'milan:queen': 150 });
  assert.equal(r.costos, 150);
  assert.equal(r.margen, 112.71, 'base 262.71 menos costo 150');
  assert.equal(r.margenPorcentaje, 42.9);
  // Si se comparara contra el total (310) el margen parecería 160: S/ 47 de
  // más que en realidad son del Estado.
  assert.notEqual(r.margen, 160);
});

test('resumirMes: sin todos los costos NO se inventa un margen', () => {
  const items = [{ productId: 'viena', sizeId: 'king', qty: 1 }];
  const r = resumirMes([pedido(410, 'Pagado', items)], {}); // sin costos
  assert.equal(r.margen, null, 'preferible no decir nada que decir algo falso');
  assert.equal(r.costos, null);
  assert.equal(r.ventasSinCosto, 1);
  // Los impuestos sí se calculan: esos no dependen de los costos.
  assert.ok(r.igv > 0);
});

test('resumirMes: el costo puede estar por producto o por producto+medida', () => {
  const items = [{ productId: 'milan', sizeId: 'queen', qty: 2 }];
  const porMedida = resumirMes([pedido(620, 'Pagado', items)], { 'milan:queen': 150 });
  const porProducto = resumirMes([pedido(620, 'Pagado', items)], { milan: 150 });
  assert.equal(porMedida.costos, 300, 'dos unidades a 150');
  assert.equal(porProducto.costos, 300, 'el costo general sirve de reserva');
});

test('resumirMes: un mes sin ventas no da NaN ni divisiones por cero', () => {
  const r = resumirMes([]);
  assert.equal(r.total, 0);
  assert.equal(r.igv, 0);
  assert.equal(r.renta, 0);
  assert.equal(r.margenPorcentaje, null);
});

test('resumenPorMes: agrupa y ordena del mes más reciente al más viejo', () => {
  const r = resumenPorMes([
    { monto: 100, estado: 'Pagado', fecha: '2026-08-10T15:00:00Z', items: [] },
    { monto: 200, estado: 'Pagado', fecha: '2026-10-10T15:00:00Z', items: [] },
    { monto: 300, estado: 'Pagado', fecha: '2026-09-10T15:00:00Z', items: [] },
  ]);
  assert.deepEqual(r.map((m) => m.mes), ['2026-10', '2026-09', '2026-08']);
  assert.equal(r[0].total, 200);
});

// ---------------------------------------------------------------------------
// El aviso de las 300 UIT
// ---------------------------------------------------------------------------
test('el aviso de las 300 UIT aparece al acercarse, no antes', () => {
  const limite = 300 * UIT; // S/ 1,650,000
  assert.equal(avisoLimiteRenta(50000), null, 'lejos: no se molesta al dueño');
  assert.match(avisoLimiteRenta(limite * 0.9), /8[0-9]%|9[0-9]%/);
  assert.match(avisoLimiteRenta(limite + 1), /ya no es el 1%/);
});
