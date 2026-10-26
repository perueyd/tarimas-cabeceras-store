// Pruebas de la conexión con el facturador electrónico.
//
// La boleta tiene que decir EXACTAMENTE lo cobrado y con qué se pagó: un
// céntimo de diferencia o un medio de pago equivocado es un comprobante que
// hay que anular con nota de crédito. Y un pedido sin pagar nunca debe salir.

import test from 'node:test';
import assert from 'node:assert/strict';

import { armarSolicitud, comprobanteParaCliente, emitirComprobante, limpiarLlave } from '../api/_facturador.js';
import { leerDatosComprobante } from '../src/lib/documento.js';
import { billetera, metodosActivos } from '../src/lib/metodosPago.js';

const pedido = (extra = {}) => ({
  code: 'ED-ABC123',
  metodo: 'Yape',
  referencia: '00123456',
  monto: 708,
  nombre: 'JUAN PÉREZ',
  docTipo: 'boleta',
  docNumero: '45678912',
  items: [{ productId: 'tarima-2p', productName: 'Tarima', sizeId: '2p', qty: 2, unitPrice: 354, opciones: [{ label: 'Brazos', valor: 'Con brazos' }] }],
  ...extra,
});

test('boleta con DNI: precios como texto, medio y nº de operación del Yape', () => {
  const { ok, solicitud } = armarSolicitud(pedido(), { sizes: [{ id: '2p', label: '2 plazas' }] });
  assert.equal(ok, true);
  assert.deepEqual(solicitud.cliente, { tipoDocumento: 'DNI', numero: '45678912', nombre: 'JUAN PÉREZ' });
  assert.equal(solicitud.tipo, 'BOLETA');
  assert.equal(solicitud.pedido, 'ED-ABC123', 'el código del pedido evita emitir dos veces');
  assert.deepEqual(solicitud.items[0], { codigo: 'TARIMA-2P-2P', descripcion: 'Tarima — 2 plazas — Brazos: Con brazos', cantidad: 2, precio: '354.00' });
  assert.deepEqual(solicitud.pago, { medio: 'YAPE', referencia: '00123456' });
  assert.equal(solicitud.descuento, undefined);
});

// Fallo que evita: con cupón u oferta, la boleta salía por el precio completo
// aunque el cliente pagó menos.
test('cupón u oferta: el descuento es lo que separa la suma de lo cobrado', () => {
  const { solicitud } = armarSolicitud(pedido({ monto: 658 }));
  assert.equal(solicitud.descuento, '50.00');
});

// Fallo que evita: 0.1 + 0.2 = 0.30000000000000004 en JavaScript, que
// inventaría un descuento de céntimos que nadie dio.
test('sin errores de decimales de JavaScript', () => {
  const { solicitud } = armarSolicitud(pedido({
    monto: 0.3,
    items: [{ productId: 'a', productName: 'A', sizeId: 'x', qty: 1, unitPrice: 0.1 }, { productId: 'b', productName: 'B', sizeId: 'x', qty: 1, unitPrice: 0.2 }],
  }));
  assert.equal(solicitud.descuento, undefined);
  assert.deepEqual(solicitud.items.map((i) => i.precio), ['0.10', '0.20']);
});

test('factura: RUC y razón social', () => {
  const { solicitud } = armarSolicitud(pedido({ docTipo: 'factura', docNumero: '20616613074', razonSocial: 'CORPORACION AGAMENON S.A.C.' }));
  assert.equal(solicitud.tipo, 'FACTURA');
  assert.deepEqual(solicitud.cliente, { tipoDocumento: 'RUC', numero: '20616613074', nombre: 'CORPORACION AGAMENON S.A.C.' });
});

test('sin documento: boleta sin cliente (el facturador exige DNI si pasa de S/ 700)', () => {
  const { solicitud } = armarSolicitud(pedido({ docNumero: undefined, docTipo: undefined }));
  assert.equal(solicitud.cliente, undefined);
  assert.equal(solicitud.tipo, 'BOLETA');
});

test('cada método de la tienda llega con su nombre al facturador', () => {
  const medio = (extra) => armarSolicitud(pedido(extra)).solicitud.pago;
  assert.deepEqual(medio({ metodo: 'Tarjeta/Yape (Culqi)', chargeId: 'chr_live_1' }), { medio: 'PASARELA', referencia: 'chr_live_1' });
  assert.equal(medio({ metodo: 'Plin' }).medio, 'PLIN');
  assert.equal(medio({ metodo: 'Transferencia bancaria' }).medio, 'TRANSFERENCIA');
  assert.equal(medio({ metodo: 'Yape/Plin' }).medio, 'OTRO', 'pedidos antiguos: no se sabe cuál fue');
  assert.deepEqual(medio({ referencia: '' }), { medio: 'YAPE' });
});

test('si se cobró MÁS que la suma de los productos, no se emite', () => {
  const r = armarSolicitud(pedido({ monto: 800 }));
  assert.equal(r.ok, false);
  assert.match(r.error, /mayor que la suma/);
});

// Mientras no estén las variables en Vercel, nada sale hacia fuera.
test('facturador sin configurar: no llama a nadie y lo explica', async () => {
  const original = globalThis.fetch;
  let llamado = false;
  globalThis.fetch = async () => { llamado = true; return new Response('{}'); };
  try {
    const r = await emitirComprobante(pedido());
    assert.match(r.error, /FACTURADOR_URL/);
    assert.equal(llamado, false);
  } finally {
    globalThis.fetch = original;
  }
});

// Fallo que evita: los pedidos pagados con tarjeta (Culqi) llegaban al panel
// sin DNI ni RUC, porque ese camino ignoraba lo que mandaba el checkout.
test('datos del comprobante: se guardan si son válidos y se descartan si no', () => {
  assert.deepEqual(leerDatosComprobante({ docTipo: 'boleta', docNumero: ' 45678912 ' }), { docTipo: 'boleta', docNumero: '45678912' });
  assert.deepEqual(leerDatosComprobante({ docTipo: 'factura', docNumero: '20616613074', razonSocial: 'X SAC' }), { docTipo: 'factura', docNumero: '20616613074', razonSocial: 'X SAC' });
  assert.deepEqual(leerDatosComprobante({ docTipo: 'boleta', docNumero: '123' }), {});
  assert.deepEqual(leerDatosComprobante({}), {});
});

// Fallo que evita: al separar Yape y Plin, una tienda configurada con el
// método antiguo "yapePlin" se habría quedado sin ninguno de los dos.
test('métodos de pago: la configuración antigua sigue valiendo', () => {
  assert.deepEqual(metodosActivos({}), { culqi: true, transferencia: true, yape: true, plin: true });
  assert.deepEqual(metodosActivos({ culqi: true, yapePlin: false, transferencia: true }), { culqi: true, transferencia: true, yape: false, plin: false });
  assert.equal(metodosActivos({ yapePlin: true, plin: false }).plin, false, 'lo nuevo manda sobre lo antiguo');
  assert.equal(billetera({ yape: '951', yapeTitular: 'ED' }, 'plin').numero, '951', 'Plin hereda el número de Yape');
  assert.equal(billetera({ yape: '951', plin: '952', plinQr: 'q.png' }, 'plin').qr, 'q.png');
});

// El seguimiento es público (basta el código del pedido): solo debe mostrar el
// número y el enlace del comprobante, y nunca uno que SUNAT rechazó.
test('seguimiento: el cliente ve su comprobante, salvo si no vale', () => {
  const c = { id: 'x', numero: 'B001-00000015', estado: 'ACEPTADO', enlace: 'https://f/c/x.y.z', total: '10.00' };
  assert.deepEqual(comprobanteParaCliente(c), { numero: 'B001-00000015', enlace: 'https://f/c/x.y.z' });
  assert.equal(comprobanteParaCliente({ ...c, estado: 'RECHAZADO' }), undefined);
  assert.equal(comprobanteParaCliente({ error: 'no se emitió' }), undefined);
  assert.equal(comprobanteParaCliente(undefined), undefined);
});

// Fallo que evita: la primera boleta real salió con "Llave de API inválida".
// La llave se copió de la ventana negra, que la muestra con dos espacios delante.
test('llave del facturador: se quitan espacios, saltos de línea y comillas', () => {
  const llave = 'fk_0a1b2c3d4e5f_' + 'A'.repeat(43);
  assert.equal(limpiarLlave(`  ${llave}\r\n`), llave);
  assert.equal(limpiarLlave(`"${llave}"`), llave);
  assert.equal(limpiarLlave(undefined), '');
});
