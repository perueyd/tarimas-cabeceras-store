// El pago decía solo «Completa todos los campos» y el cliente no sabía cuál
// le faltaba (lo reportó el dueño, 23/11/2026). Ahora se señala el primero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { primerCampoQueFalta } from '../src/lib/camposCheckout.js';

const completo = {
  nombre: 'Ana Pérez', email: 'ana@correo.pe', telefono: '999888777', direccion: 'Av. Lima 123',
  distrito: 'Surco', docTipo: 'boleta', docNumero: '12345678', entregaFecha: '2026-11-25', entregaHorario: 'tarde',
};

test('con todo lleno no falta nada', () => {
  assert.equal(primerCampoQueFalta(completo), null);
});

test('señala el primer campo vacío, en el orden de la pantalla', () => {
  assert.equal(primerCampoQueFalta({ ...completo, telefono: '', entregaFecha: '' }).campo, 'telefono');
  assert.equal(primerCampoQueFalta({ ...completo, distrito: '  ' }).campo, 'distrito');
  assert.equal(primerCampoQueFalta({ ...completo, entregaHorario: '' }).campo, 'entregaHorario');
  assert.match(primerCampoQueFalta({ ...completo, entregaFecha: '' }).mensaje, /fecha/);
});

test('documento: DNI corto, RUC sin razón social', () => {
  const dni = primerCampoQueFalta({ ...completo, docNumero: '1234' });
  assert.equal(dni.campo, 'docNumero');
  assert.match(dni.mensaje, /8 dígitos/);
  const ruc = primerCampoQueFalta({ ...completo, docTipo: 'factura', docNumero: '20616613074', razonSocial: '' });
  assert.equal(ruc.campo, 'razonSocial');
});

// El calendario del iPhone (Safari) no respeta el `min` del campo de fecha y
// dejaba elegir días que ya pasaron (lo reportó el dueño, 25/11/2026). El pago
// no puede seguir con una fecha que no se puede cumplir.
test('fecha de entrega anterior a la primera posible: no deja pagar', () => {
  const pasada = primerCampoQueFalta({ ...completo, entregaFecha: '2026-11-01' }, { fechaMinima: '2026-11-26' });
  assert.equal(pasada.campo, 'entregaFecha');
  assert.match(pasada.mensaje, /26 de noviembre/);
  assert.equal(primerCampoQueFalta({ ...completo, entregaFecha: '2026-11-26' }, { fechaMinima: '2026-11-26' }), null);
  assert.equal(primerCampoQueFalta({ ...completo, entregaFecha: '2026-12-03' }, { fechaMinima: '2026-11-26' }), null);
});
