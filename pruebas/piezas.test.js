// Piezas que se descargan solo cuando hacen falta (src/lib/cargarPieza.js).
//
// El fallo que evitan: al publicar una versión nueva, las piezas viejas dejan
// de existir. Quien tenía la tienda abierta desde antes pedía una pieza vieja
// y la página entera se caía con «Importing a module script failed». Llegó
// dos veces a la lista de errores del panel (13 y 17 de noviembre de 2026).
// Ahora la página se recarga sola UNA vez y trae la versión nueva.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { conRecarga, recargarUnaVez } from '../src/lib/cargarPieza.js';

function almacenDePrueba() {
  const datos = new Map();
  return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)) };
}

test('si una pieza falla, la página se recarga una sola vez por minuto', () => {
  const almacen = almacenDePrueba();
  let recargas = 0;
  const recargar = () => { recargas += 1; };
  const t = 1_000_000;
  assert.equal(recargarUnaVez({ almacen, recargar, ahora: t }), true);
  // Volvió a fallar enseguida tras recargar: el problema es otro, no se recarga sin fin.
  assert.equal(recargarUnaVez({ almacen, recargar, ahora: t + 5_000 }), false);
  // Una publicación nueva, más tarde, sí vuelve a recargar.
  assert.equal(recargarUnaVez({ almacen, recargar, ahora: t + 61_000 }), true);
  assert.equal(recargas, 2);
});

test('sin almacenamiento (navegador bloqueado) no recarga: un bucle sería peor', () => {
  const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => {} };
  let recargas = 0;
  assert.equal(recargarUnaVez({ almacen: roto, recargar: () => { recargas += 1; } }), false);
  assert.equal(recargas, 0);
});

test('mientras recarga, la pieza se queda "cargando"; si no puede recargar, el error se ve', async () => {
  const fallo = new Error('Importing a module script failed.');
  const pieza = { default: 'ok' };
  assert.equal(await conRecarga(async () => pieza, () => true)(), pieza, 'una pieza que carga bien no se toca');

  const pendiente = conRecarga(async () => { throw fallo; }, () => true)();
  const gana = await Promise.race([pendiente.then(() => 'terminó', () => 'falló'), new Promise((r) => setTimeout(() => r('sigue cargando'), 30))]);
  assert.equal(gana, 'sigue cargando', 'mientras la página se recarga no debe mostrarse el error');

  await assert.rejects(conRecarga(async () => { throw fallo; }, () => false)(), fallo);
});

test('ninguna pieza de la tienda se carga sin la recarga de rescate', () => {
  const archivos = [];
  const recorrer = (dir) => {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (/\.(jsx?|mjs)$/.test(nombre)) archivos.push(ruta);
    }
  };
  recorrer(new URL('../src', import.meta.url).pathname);
  const sinRescate = [];
  for (const ruta of archivos) {
    if (ruta.endsWith('cargarPieza.js')) continue;
    readFileSync(ruta, 'utf8').split('\n').forEach((linea, i) => {
      if (!/\bimport\(/.test(linea) || /^\s*(\/\/|\*)/.test(linea)) return;
      if (!/(lazyConRecarga|conRecarga)\(\(\) => import\(/.test(linea)) sinRescate.push(`${ruta.split('/src/')[1]}:${i + 1}`);
    });
  }
  assert.deepEqual(sinRescate, [], 'usa lazyConRecarga() o conRecarga() de src/lib/cargarPieza.js');
});
