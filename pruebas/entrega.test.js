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
import {
  alcanzaParaHoy,
  primerDiaDeEntrega,
  horariosDeReparto,
  reglaDelPedido,
  reglasDeEntrega,
  respuestaDeEntrega,
  textoDePlazo,
} from '../src/lib/entrega.js';

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

const SLOTS = [
  { id: 'manana', label: 'Mañana (9:00 a.m. – 1:00 p.m.)' },
  { id: 'tarde', label: 'Tarde (2:00 p.m. – 6:00 p.m.)' },
  { id: 'noche', label: 'Noche (6:00 p.m. – 10:30 p.m.)' },
];

// La regla del taller: lo que entra hasta las 8 se fabrica ese día y se lo
// entregan al dueño A LAS 5 DE LA TARDE, así que para HOY no hay elección de
// hora. Para cualquier otro día el mueble ya está hecho desde la víspera y el
// cliente elige la hora que quiera.
test('para HOY mismo solo caben los horarios de las 5 en adelante', () => {
  const ahora = limaUTC(7, 7, 0); // 7 de la mañana: alcanza para hoy
  assert.deepEqual(
    horariosDeReparto(SLOTS, '2026-10-07', ahora).map((s) => s.id),
    ['noche'],
    'El taller se lo entrega al dueño a las 5; mañana y tarde son imposibles hoy.'
  );
});

test('para OTRO día el cliente elige la hora que quiera', () => {
  const ahora = limaUTC(7, 7, 0);
  assert.deepEqual(
    horariosDeReparto(SLOTS, '2026-10-08', ahora).map((s) => s.id),
    ['manana', 'tarde', 'noche'],
    'Al día siguiente el mueble ya está hecho: no hay motivo para quitarle horas.'
  );
});

test('sin fecha elegida todavía, se muestran todas', () => {
  assert.deepEqual(horariosDeReparto(SLOTS, '', limaUTC(7, 7, 0)).length, 3);
});

test('si para hoy no cuadra ninguno, se ofrecen todos antes que dejarlo sin comprar', () => {
  const soloManana = [{ id: 'manana', label: 'Mañana (9:00 a.m. – 1:00 p.m.)' }];
  assert.deepEqual(horariosDeReparto(soloManana, '2026-10-07', limaUTC(7, 7, 0)).map((s) => s.id), ['manana']);
});

// ---------------------------------------------------------------------------
// Una regla por tipo de producto (el dueño, 19/11/2026).
//
// POR QUÉ SE PRUEBA: había una sola regla para todo y CHAT-ED le prometía a
// una tarima la de las cabeceras. La de la cabecera es «hasta las 8 a. m.,
// hoy desde las 5 p. m., y puede retrasarse 1 a 3 días»; la de la tarima es
// «hasta las 9 a. m., hoy SEGÚN DISPONIBILIDAD». Prometer como seguro lo que
// no lo es se le puede exigir a la tienda (Ley 29571).
// ---------------------------------------------------------------------------
const REGLAS = reglasDeEntrega({});
const cabecera = reglaDelPedido(REGLAS, ['cabeceras']);
const tarima = reglaDelPedido(REGLAS, ['tarimas']);

test('cabecera: hasta las 8 entra para hoy y solo se reparte desde las 5 p. m.', () => {
  assert.equal(primerDiaDeEntrega(limaUTC(29, 8, 0), cabecera), '2026-10-29');
  assert.equal(primerDiaDeEntrega(limaUTC(29, 8, 30), cabecera), '2026-10-30');
  assert.deepEqual(horariosDeReparto(SLOTS, '2026-10-29', limaUTC(29, 7, 0), cabecera).map((s) => s.id), ['noche']);
  assert.match(textoDePlazo(cabecera), /de 1 a 3 días más/, 'la cabecera tiene que avisar que puede retrasarse');
});

test('tarima: hasta las 9 entra para hoy, pero según disponibilidad y desde las 11', () => {
  assert.equal(primerDiaDeEntrega(limaUTC(29, 8, 30), tarima), '2026-10-29', 'a las 8:30 una tarima todavía entra para hoy');
  assert.equal(primerDiaDeEntrega(limaUTC(29, 9, 0), tarima), '2026-10-29');
  assert.equal(primerDiaDeEntrega(limaUTC(29, 9, 1), tarima), '2026-10-30');
  // 9 a. m. + 2 horas de fabricación: la mañana (9 a 1) no cabe hoy; la tarde y la noche sí.
  assert.deepEqual(horariosDeReparto(SLOTS, '2026-10-29', limaUTC(29, 8, 0), tarima).map((s) => s.id), ['tarde', 'noche']);
  assert.equal(tarima.seguro, false);
  assert.match(textoDePlazo(tarima), /según la disponibilidad del taller/);
  assert.doesNotMatch(textoDePlazo(tarima), /te lo entregamos hoy mismo/, 'lo de hoy NO se puede prometer como seguro');
});

test('cabecera y tarima juntas: manda la más exigente de las dos', () => {
  const juntas = reglaDelPedido(REGLAS, ['tarimas', 'cabeceras']);
  assert.deepEqual(juntas, { corte: 8, desde: 17, seguro: false, demora: '1 a 3 días' });
  assert.equal(primerDiaDeEntrega(limaUTC(29, 8, 30), juntas), '2026-10-30', 'a las 8:30 la cabecera ya no llega hoy');
});

test('lo que no tiene regla propia (colchones) usa la general de siempre', () => {
  assert.deepEqual(reglaDelPedido(REGLAS, ['colchones']), REGLAS.general);
  assert.deepEqual(reglaDelPedido(REGLAS, []), REGLAS.general, 'un carrito vacío o sin categoría también');
});

test('lo que el dueño cambia en el panel manda sobre la regla de fábrica', () => {
  const reglas = reglasDeEntrega({
    reglasEntrega: { tarimas: null, colchones: { corte: null, desde: 0, seguro: true, demora: '' }, general: { corte: 10, desde: 15 } },
  });
  assert.deepEqual(reglas.tarimas, undefined, '«usa la regla general» deja la tarima sin regla propia');
  assert.equal(reglaDelPedido(reglas, ['tarimas']).corte, 10);
  assert.equal(alcanzaParaHoy(limaUTC(29, 6, 0), reglaDelPedido(reglas, ['colchones'])), false, 'sin entrega el mismo día, nunca es hoy');
  assert.match(textoDePlazo(reglas.colchones), /desde el día siguiente/);
  // Datos raros guardados no rompen nada: se vuelve a la regla de partida.
  assert.equal(reglasDeEntrega({ reglasEntrega: { cabeceras: { corte: 'las ocho', desde: 99 } } }).cabeceras.corte, 8);
});

test('la pregunta frecuente se arma con las mismas reglas, una línea por tipo que se vende', () => {
  const texto = respuestaDeEntrega(REGLAS, [
    { id: 'cabeceras', label: 'Cabeceras' },
    { id: 'tarimas', label: 'Tarimas' },
    { id: 'colchones', label: 'Colchones' },
  ]);
  assert.match(texto, /Cabeceras: Pídelo hasta las 8 a\. m\./);
  assert.match(texto, /Tarimas: Pídelo hasta las 9 a\. m\. y, según la disponibilidad/);
  assert.match(texto, /Colchones: Pídelo hasta las 8 a\. m\. y te lo entregamos hoy mismo desde las 5 p\. m\./);
  assert.match(texto, /provincias/);
});
