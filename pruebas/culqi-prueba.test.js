// Evita que una llave de PRUEBA de Culqi puesta por error en la tienda
// publicada deje pedidos «pagados» con tarjetas de mentira (sin dinero).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esLlaveDePrueba, motivoParaNoCobrar } from '../src/lib/culqiPrueba.js';

test('reconoce las llaves de prueba y las reales', () => {
  assert.equal(esLlaveDePrueba('pk_test_abc'), true);
  assert.equal(esLlaveDePrueba('sk_test_abc'), true);
  assert.equal(esLlaveDePrueba('pk_live_abc'), false);
  assert.equal(esLlaveDePrueba(undefined), false);
});

test('en la tienda publicada no se cobra con llave de prueba', () => {
  assert.match(motivoParaNoCobrar('sk_test_abc', 'production'), /PRUEBA/);
  assert.equal(motivoParaNoCobrar('sk_live_abc', 'production'), null);
  assert.equal(motivoParaNoCobrar('sk_test_abc', 'preview'), null);
});
