// Los estados de pedido que cuentan como venta tienen que existir de verdad.
//
// En api/_impuestos.js hay una lista de estados que significan "el dinero
// entró" y por tanto hay que declarar. Esa lista se escribió a mano, y al
// escribirla se colaron dos estados que esta tienda no usa ("En preparación",
// "Enviado"). No rompía nada, pero el día que alguien añadiera un estado nuevo
// en orders.js y olvidara añadirlo aquí, esas ventas desaparecerían de la
// declaración sin que nadie lo notara.
//
// Esta prueba cierra esa puerta por los dos lados.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

function listaDe(archivo, nombre) {
  const src = leer(archivo);
  const m = src.match(new RegExp(`const ${nombre} = \\[([^\\]]+)\\]`));
  if (!m) throw new Error(`no encontré ${nombre} en ${archivo}`);
  return m[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

test('todo estado que cuenta como venta existe en orders.js', () => {
  const validos = listaDe('api/orders.js', 'ESTADOS_VALIDOS');
  const cuentan = listaDe('api/_impuestos.js', 'ESTADOS_QUE_CUENTAN');

  for (const estado of cuentan) {
    assert.ok(
      validos.includes(estado),
      `api/_impuestos.js declara ventas en estado "${estado}", pero ese estado no existe ` +
        `en api/orders.js. Estados reales: ${validos.join(', ')}.`
    );
  }
});

test('los estados que NO cuentan son exactamente los que no deben contar', () => {
  const validos = listaDe('api/orders.js', 'ESTADOS_VALIDOS');
  const cuentan = listaDe('api/_impuestos.js', 'ESTADOS_QUE_CUENTAN');
  const fuera = validos.filter((e) => !cuentan.includes(e));

  // Un pedido por verificar todavía puede caerse; uno cancelado ya se cayó.
  // Declarar IGV por cualquiera de los dos es pagar por dinero no cobrado.
  assert.deepEqual(
    fuera.sort(),
    ['Cancelado', 'Pago por verificar'],
    'Si añadiste un estado nuevo en orders.js, decide si cuenta como venta ' +
      'y actualiza ESTADOS_QUE_CUENTAN en api/_impuestos.js.'
  );
});
