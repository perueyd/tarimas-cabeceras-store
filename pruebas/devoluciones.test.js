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

// Ley 29571, art. 97 c (vicios ocultos) y art. 20 (la garantía legal no se
// puede recortar): el plazo de 7 días para avisar no puede leerse como el fin
// de la garantía para un defecto que aparece después.
test('los defectos que aparecen después de 7 días siguen cubiertos por la garantía', () => {
  const [devolver] = seccionesDeDevolucion(TERMINOS);
  assert.match(devolver.texto, /después de esos 7 días, te atendemos igual dentro de la garantía/);
});
