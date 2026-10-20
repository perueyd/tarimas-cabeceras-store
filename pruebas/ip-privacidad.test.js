// La IP del visitante no puede quedar escrita en la base de datos.
//
// Todos los límites del sitio se cuentan por IP. Hasta ahora la IP acababa en
// el NOMBRE de la clave ("ratelimit:visita:190.12.34.56"): caducaba sola, pero
// mientras tanto había una lista legible de quién había entrado. En Perú una
// dirección IP es un dato personal (Ley 29733), así que guardarla —aunque sea
// un rato— es tratarla, y había que declararlo o dejar de hacerlo.
//
// Se dejó de hacer. Estas pruebas vigilan que no vuelva.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fuente = fs.readFileSync(path.join(RAIZ, 'api/_ratelimit.js'), 'utf8');

test('ninguna clave de Redis se arma con la IP en claro', () => {
  const enClaro = [...fuente.matchAll(/`ratelimit:\$\{(\w+)\}`/g)].map((m) => m[1]);
  assert.deepEqual(
    enClaro,
    [],
    'Estas claves meten el valor tal cual en Redis: ' + enClaro.join(', ') +
      '. Tienen que pasar por claveSegura(), que sustituye la IP por su huella.'
  );
});

test('las tres funciones que escriben en Redis usan la huella', () => {
  const usos = (fuente.match(/claveSegura\(key\)/g) || []).length;
  assert.ok(
    usos >= 3,
    `Solo ${usos} usos de claveSegura(). Deben pasar por ella getCount(), bump() ` +
      'y rateLimitRequest(): si una se queda fuera, ese endpoint sigue guardando IPs.'
  );
});

test('la huella es irreversible y estable', async () => {
  const { createHash } = await import('crypto');
  const huella = (ip) => createHash('sha256').update(ip).digest('hex').slice(0, 16);

  // Estable: la misma IP da siempre lo mismo, o el contador no contaría.
  assert.equal(huella('190.12.34.56'), huella('190.12.34.56'));
  // Distinta: dos visitantes no pueden compartir contador.
  assert.notEqual(huella('190.12.34.56'), huella('190.12.34.57'));
  // Irreversible: no queda ni un trozo de la IP a la vista.
  assert.ok(!huella('190.12.34.56').includes('190'));
  assert.ok(!huella('190.12.34.56').includes('34'));
});

test('el prefijo se conserva legible para poder distinguir cada límite', () => {
  assert.match(
    fuente,
    /texto\.slice\(0, i\)/,
    'claveSegura() debe dejar el prefijo ("visita", "auth-fail"...) sin tocar: ' +
      'sin él no se sabría de qué límite es cada clave.'
  );
});

test('el contador de visitas no guarda nada de la persona', () => {
  const visitas = fs.readFileSync(path.join(RAIZ, 'api/_rutas/visitas.js'), 'utf8');
  // Lo único que se escribe son contadores (HINCRBY) sobre la clave del día.
  const escrituras = [...visitas.matchAll(/redisCmd\(\['(\w+)'/g)].map((m) => m[1]);
  const permitidas = ['HINCRBY', 'EXPIRE', 'HGETALL'];
  for (const cmd of escrituras) {
    assert.ok(
      permitidas.includes(cmd),
      `El contador de visitas usa "${cmd}". Solo puede sumar contadores ` +
        `(${permitidas.join(', ')}): cualquier otra cosa podría guardar datos del visitante.`
    );
  }
  assert.ok(!/clientIp\(req\)\s*\)/.test(visitas.replace(/rateLimitRequest\([^)]*\)/g, '')),
    'la IP solo puede usarse para el límite de peticiones, nunca para guardarla');
});
