// El Libro de Reclamaciones decía «30 días calendario» y citaba la norma
// equivocada. Desde 2022 son 15 días HÁBILES (DS 101-2022-PCM, arts. 6 y 6-B).
// El panel avisaba con el plazo viejo: un reclamo podía vencer «a tiempo».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diasHabilesRestantes, LEYENDAS_RECLAMO, PLAZO_RECLAMO_DIAS_HABILES } from '../src/lib/reclamos.js';
import { TERMINOS } from '../src/data/textosLegales.js';

// Lunes 23/11/2026, 10 a. m. en Lima (15:00 UTC).
const LUNES = '2026-11-23T15:00:00Z';

test('el plazo son 15 días hábiles y se cuentan de lunes a viernes', () => {
  assert.equal(PLAZO_RECLAMO_DIAS_HABILES, 15);
  assert.equal(diasHabilesRestantes(LUNES, new Date(LUNES)), 15, 'el día en que se presenta no cuenta');
  assert.equal(diasHabilesRestantes(LUNES, new Date('2026-11-28T15:00:00Z')), 11, 'sábado: van martes a viernes (4)');
  assert.equal(diasHabilesRestantes(LUNES, new Date('2026-11-30T15:00:00Z')), 10, 'el fin de semana no cuenta');
  assert.equal(diasHabilesRestantes(LUNES, new Date('2026-12-14T15:00:00Z')), 0, 'tres semanas después vence');
  assert.ok(diasHabilesRestantes(LUNES, new Date('2026-12-15T15:00:00Z')) < 0);
});

test('las leyendas y los términos dicen el plazo vigente, no el de 30 días', () => {
  assert.ok(LEYENDAS_RECLAMO.some((l) => l.includes('quince (15) días hábiles')));
  assert.ok(LEYENDAS_RECLAMO.some((l) => l.includes('no impide acudir a otras vías')));
  assert.match(TERMINOS, /15 días hábiles/);
  assert.doesNotMatch(TERMINOS, /30 días calendario/);
});

// Los Términos ya guardados en la tienda traen la frase vieja: al mostrarlos
// se corrige, sin tocar el resto del texto del dueño.
import { corregirPlazoDeReclamos } from '../src/lib/reclamos.js';
test('la frase vieja del plazo se corrige al mostrar los Términos guardados', () => {
  const viejo = 'Al registrar tu reclamo recibirás un folio y te responderemos en un plazo máximo de 30 días calendario, conforme al Decreto Supremo N.° 006-2017-JUS.\n\n10. TUS DATOS';
  const nuevo = corregirPlazoDeReclamos(viejo);
  assert.match(nuevo, /15 días hábiles improrrogables/);
  assert.doesNotMatch(nuevo, /30 días calendario|006-2017-JUS/);
  assert.match(nuevo, /10\. TUS DATOS$/);
  assert.equal(corregirPlazoDeReclamos('otro texto'), 'otro texto');
});
