// Pruebas del DNI y el RUC.
//
// Con estos datos se emite la boleta o la factura. Un dígito mal y el
// comprobante sale a nombre de otro o lo rechaza la SUNAT, y para entonces el
// mueble ya se entregó.

import test from 'node:test';
import assert from 'node:assert/strict';

import { dniValido, etiquetaComprobante, revisarComprobante, rucValido } from '../src/lib/documento.js';

test('DNI: ocho dígitos, ni uno más ni uno menos', () => {
  assert.equal(dniValido('45678912'), true);
  assert.equal(dniValido('4567891'), false, 'siete');
  assert.equal(dniValido('456789123'), false, 'nueve');
  assert.equal(dniValido('4567891a'), false, 'con letra');
  assert.equal(dniValido(''), false);
  assert.equal(dniValido(null), false);
});

test('DNI: se aceptan los espacios de más al copiar y pegar', () => {
  assert.equal(dniValido('  45678912  '), true);
});

// Dos RUC reales como caso de control, uno de persona natural (empieza en 10)
// y otro de empresa (empieza en 20). Si alguna de estas falla, el cálculo del
// dígito verificador está mal y estaría rechazando RUC buenos.
test('RUC: los dos tipos de RUC real se aceptan', () => {
  assert.equal(rucValido('10742276878'), true, 'persona natural con negocio');
  assert.equal(rucValido('20616613074'), true, 'empresa');
});

test('RUC: cambiar un solo dígito lo invalida', () => {
  // Esto es justo lo que la comprobación tiene que cazar: un error de tecleo.
  assert.equal(rucValido('10742276879'), false, 'último dígito cambiado');
  assert.equal(rucValido('10742276778'), false, 'un dígito del medio cambiado');
});

test('RUC: tiene que empezar en 10, 15, 17 o 20', () => {
  assert.equal(rucValido('30742276878'), false, '30 no existe');
  assert.equal(rucValido('99999999999'), false);
});

test('RUC: el largo correcto son 11 dígitos', () => {
  assert.equal(rucValido('1074227687'), false, 'diez');
  assert.equal(rucValido('107422768781'), false, 'doce');
  assert.equal(rucValido('20123456789'), false, 'once pero con verificador malo');
});

test('RUC: el caso en que el verificador da 10 o 11 se resuelve bien', () => {
  // La regla dice que un resto de 10 se convierte en 0 y uno de 11 en 1. Sin
  // eso, esos RUC se rechazarían siendo válidos. Se comprueba generando los
  // verificadores a mano para un prefijo conocido.
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  for (const base of ['2060059998', '1072276878', '2010010010']) {
    const suma = pesos.reduce((t, p, i) => t + p * Number(base[i]), 0);
    const resto = 11 - (suma % 11);
    const dv = resto === 10 ? 0 : resto === 11 ? 1 : resto;
    assert.equal(rucValido(base + dv), true, `${base}${dv} debería ser válido`);
  }
});

test('revisarComprobante: la boleta solo necesita el DNI', () => {
  assert.equal(revisarComprobante({ tipo: 'boleta', numero: '45678912' }), null);
  assert.match(revisarComprobante({ tipo: 'boleta', numero: '123' }), /8 dígitos/);
});

test('revisarComprobante: la factura necesita RUC Y razón social', () => {
  assert.equal(
    revisarComprobante({ tipo: 'factura', numero: '10742276878', razonSocial: 'Mi Empresa SAC' }),
    null
  );
  assert.match(
    revisarComprobante({ tipo: 'factura', numero: '10742276878', razonSocial: '  ' }),
    /razón social/i
  );
  assert.match(revisarComprobante({ tipo: 'factura', numero: '123' }), /11 dígitos/);
});

test('revisarComprobante: sin tipo se asume boleta', () => {
  assert.equal(revisarComprobante({ numero: '45678912' }), null);
});

test('los mensajes de error dicen qué hacer, no qué falló', () => {
  const mensajes = [
    revisarComprobante({ tipo: 'boleta', numero: 'x' }),
    revisarComprobante({ tipo: 'factura', numero: 'x' }),
    revisarComprobante({ tipo: 'factura', numero: '10742276878', razonSocial: '' }),
  ];
  for (const m of mensajes) {
    assert.ok(m && m.length > 15, 'el mensaje tiene que explicar algo');
    assert.ok(!/inválido|error|incorrecto/i.test(m), `"${m}" suena a reproche, no a instrucción`);
  }
});

test('etiquetaComprobante: texto corto para el panel', () => {
  assert.equal(etiquetaComprobante({ tipo: 'boleta', numero: '45678912' }), 'Boleta · DNI 45678912');
  assert.equal(
    etiquetaComprobante({ tipo: 'factura', numero: '10742276878', razonSocial: 'Mi Empresa SAC' }),
    'Factura · RUC 10742276878 · Mi Empresa SAC'
  );
  assert.equal(etiquetaComprobante({}), '', 'sin datos no inventa nada');
});
