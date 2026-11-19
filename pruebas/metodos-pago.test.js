// Pruebas de los métodos de pago que ofrece la tienda (Yape, Plin, tarjeta…).

import test from 'node:test';
import assert from 'node:assert/strict';

import { billetera, metodosActivos } from '../src/lib/metodosPago.js';

// Fallo que evita: al separar Yape y Plin, una tienda configurada con el
// método antiguo "yapePlin" se habría quedado sin ninguno de los dos.
test('métodos de pago: la configuración antigua sigue valiendo', () => {
  assert.deepEqual(metodosActivos({}), { culqi: true, transferencia: true, contraEntrega: false, yape: true, plin: true });
  assert.deepEqual(metodosActivos({ culqi: true, yapePlin: false, transferencia: true }), { culqi: true, transferencia: true, contraEntrega: false, yape: false, plin: false });
  // Contra entrega NO se enciende solo: compromete fabricar antes de cobrar.
  assert.equal(metodosActivos({}).contraEntrega, false);
  assert.equal(metodosActivos({ contraEntrega: true }).contraEntrega, true);
  assert.equal(metodosActivos({ yapePlin: true, plin: false }).plin, false, 'lo nuevo manda sobre lo antiguo');
  assert.equal(billetera({ yape: '951', yapeTitular: 'ED' }, 'plin').numero, '951', 'Plin hereda el número de Yape');
  assert.equal(billetera({ yape: '951', plin: '952', plinQr: 'q.png' }, 'plin').qr, 'q.png');
});

// Fallo que evita (19/11/2026): la tarjeta estaba apagada en el panel, pero el
// pie de página, la portada, una pregunta frecuente y las condiciones de
// compra seguían diciendo «aceptamos tarjeta». El panel ahora los señala.
test('con la tarjeta apagada se encuentran los textos que todavía la prometen', async () => {
  const { textosQueMencionanTarjeta } = await import('../src/lib/metodosPago.js');
  const cfg = {
    footer: { paymentText: 'Pagos procesados de forma segura con Culqi.' },
    landing: { comoFunciona: { pasos: [{ texto: 'Elige tu medida.' }, { texto: 'Con tarjeta o Yape a través de Culqi.' }] } },
    faq: [{ q: '¿Cómo puedo pagar?', a: 'Aceptamos Yape/Plin y tarjeta.' }, { q: '¿Hacen envíos?', a: 'Sí, a todo Lima.' }],
    cuotasTexto: 'sin intereses con tu tarjeta',
    legal: { terminosTexto: '4. CONTRATO\nSe cierra al pagar.\n\n5. FORMAS DE PAGO\nAceptamos tarjeta y Yape a través de Culqi. En los pagos directos…' },
  };
  const hallados = textosQueMencionanTarjeta(cfg).map((h) => h.donde);
  assert.equal(hallados.length, 4, JSON.stringify(hallados));
  assert.ok(hallados.some((d) => d.includes('Branding')));
  assert.ok(hallados.some((d) => d.includes('¿Cómo puedo pagar?')));
  assert.ok(!hallados.some((d) => d.includes('cuotas')), 'las cuotas no se muestran si no hay número de cuotas');
  assert.match(textosQueMencionanTarjeta(cfg).at(-1).texto, /^Aceptamos tarjeta/, 'de las condiciones se enseña solo la frase');
  assert.deepEqual(textosQueMencionanTarjeta({ faq: [{ q: 'x', a: 'Yape y Plin' }] }), []);
});
