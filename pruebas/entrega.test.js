// La regla de entrega: de un día para otro, con corte a las 8 de la mañana.
//
// POR QUÉ SE PRUEBA: es una promesa al cliente que depende de la HORA, y los
// fallos de hora en este proyecto ya costaron caro una vez (las ofertas se
// morían a las 7 de la tarde porque el servidor va en UTC y Perú cinco horas
// por detrás). Aquí el mismo descuido haría que a las 10 de la noche de Lima
// —que en UTC ya es el día siguiente— se le prometiera al cliente una entrega
// para un día que ya pasó.
//
// Por eso cada caso se escribe con una hora UTC explícita y se comprueba el
// día de Lima que debe salir.

import test from 'node:test';
import assert from 'node:assert/strict';
import { alcanzaParaHoy, primerDiaDeEntrega, horariosDeReparto } from '../src/lib/entrega.js';

// Lima va 5 horas por detrás de UTC: las 07:00 de Lima son las 12:00 UTC.
const limaUTC = (dia, hora, min = 0) =>
  new Date(Date.UTC(2026, 9, dia, hora + 5, min)); // mes 9 = octubre

test('pedido ANTES de las 8 de la mañana: se entrega hoy mismo', () => {
  assert.equal(primerDiaDeEntrega(limaUTC(29, 7, 30)), '2026-10-29');
  assert.equal(alcanzaParaHoy(limaUTC(29, 7, 30)), true);
});

test('pedido justo A LAS 8 en punto: todavía entra para hoy', () => {
  assert.equal(primerDiaDeEntrega(limaUTC(29, 8, 0)), '2026-10-29');
  assert.equal(alcanzaParaHoy(limaUTC(29, 8, 0)), true);
});

test('pedido a las 8:01: ya pasa al día siguiente', () => {
  assert.equal(primerDiaDeEntrega(limaUTC(29, 8, 1)), '2026-10-30');
  assert.equal(alcanzaParaHoy(limaUTC(29, 8, 1)), false);
});

test('pedido de noche: al día siguiente, no a dos días', () => {
  assert.equal(primerDiaDeEntrega(limaUTC(29, 22, 0)), '2026-10-30');
});

// El caso que de verdad importa: a las 22:00 de Lima en UTC ya es día 30.
// Si se calculara con la hora del servidor, saldría 31 y se le prometería al
// cliente un día de más.
test('de noche NO se cuenta el día de UTC, se cuenta el de Lima', () => {
  const nocheLima = limaUTC(29, 22, 0);
  assert.equal(nocheLima.toISOString().slice(0, 10), '2026-10-30', 'en UTC ya es el día 30');
  assert.equal(primerDiaDeEntrega(nocheLima), '2026-10-30', 'pero en Lima es el 29, así que entrega el 30');
});

test('cambio de mes: el 31 de octubre de noche pasa al 1 de noviembre', () => {
  assert.equal(primerDiaDeEntrega(limaUTC(31, 20, 0)), '2026-11-01');
});

test('solo se ofrecen horarios de las 5 de la tarde en adelante', () => {
  const slots = [
    { id: 'manana', label: 'Mañana (9:00 a.m. – 1:00 p.m.)' },
    { id: 'tarde', label: 'Tarde (2:00 p.m. – 6:00 p.m.)' },
    { id: 'noche', label: 'Noche (6:00 p.m. – 10:30 p.m.)' },
  ];
  assert.deepEqual(
    horariosDeReparto(slots).map((s) => s.id),
    ['noche'],
    'Mañana y tarde empiezan antes de las 5, así que no se pueden ofrecer.'
  );
});

test('si ninguno empieza tarde, se ofrecen todos en vez de dejar al cliente sin opciones', () => {
  const slots = [{ id: 'manana', label: 'Mañana (9:00 a.m. – 1:00 p.m.)' }];
  assert.deepEqual(horariosDeReparto(slots).map((s) => s.id), ['manana']);
});
