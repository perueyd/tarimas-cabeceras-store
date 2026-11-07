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
