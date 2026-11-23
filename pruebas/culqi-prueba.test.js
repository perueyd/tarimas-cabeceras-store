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

// El aviso de «bloqueado por la política de seguridad» solo debe llevar el dominio.
import { soloDominio } from '../src/lib/reportarError.js';
test('el aviso de bloqueo no lleva la ruta ni los datos de la dirección', () => {
  assert.equal(soloDominio('https://checkoutview.culqi.com/v4/x?token=abc'), 'https://checkoutview.culqi.com');
  assert.equal(soloDominio('inline'), 'inline');
});

// Culqi pide los datos del cliente en cada cargo (antifraud_details); sin
// ellos su antifraude rechaza más compras buenas. Los vacíos no se mandan.
import { datosAntifraude } from '../api/create-charge.js';
test('datos antifraude: nombre partido, teléfono solo con números, sin vacíos', () => {
  assert.deepEqual(datosAntifraude({ nombre: 'Ana María Pérez', telefono: '+51 999 888 777', direccion: 'Av. Lima 123' }), {
    first_name: 'Ana', last_name: 'María Pérez', address: 'Av. Lima 123', address_city: 'Lima', country_code: 'PE', phone_number: '999888777',
  });
  assert.equal('last_name' in datosAntifraude({ nombre: 'Ana' }), false);
});

// Lo que llega del navegador para 3DS se limpia: solo los campos que Culqi espera.
import { huellaValida, limpiarAutenticacion3DS } from '../api/create-charge.js';
test('3DS: huella y resultado de la verificación, limpios', () => {
  assert.equal(huellaValida('8019959c-fab1-49eb-bbbe-b846d308d8df'), '8019959c-fab1-49eb-bbbe-b846d308d8df');
  assert.equal(huellaValida('<script>'), null);
  assert.deepEqual(limpiarAutenticacion3DS({ eci: '05', xid: 'abc', otro: 'x', cavv: 7 }), { eci: '05', xid: 'abc' });
  assert.equal(limpiarAutenticacion3DS('nada'), null);
});
