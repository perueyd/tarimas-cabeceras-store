// La pasarela de pagos (requisitos de URL de Culqi) pide una «Política de
// cambios y devoluciones» visible. Sale de los Términos ya publicados, así que
// tiene que encontrar sus secciones tanto en el texto de fábrica como en uno
// editado, y no traer las demás.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seccionesDeDevolucion } from '../src/lib/devoluciones.js';
import { TERMINOS } from '../src/data/textosLegales.js';

test('toma solo devolución y garantía de los Términos de fábrica', () => {
  const s = seccionesDeDevolucion(TERMINOS);
  assert.deepEqual(s.map((x) => x.titulo), ['DERECHO A DEVOLVER TU COMPRA', 'GARANTÍA']);
  assert.match(s[0].texto, /7 días calendario/);
  assert.doesNotMatch(s[0].texto, /GARANTÍA|LIBRO DE RECLAMACIONES/);
});

test('sin secciones de devolución no inventa nada', () => {
  assert.deepEqual(seccionesDeDevolucion('1. PRECIOS\nTodo con IGV.'), []);
  assert.deepEqual(seccionesDeDevolucion(undefined), []);
});
