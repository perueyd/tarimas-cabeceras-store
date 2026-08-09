// Segundo paso: apunta cada producto del catálogo a su foto nueva.
//
// Se ejecuta DESPUÉS de subir-fotos.mjs, que deja el emparejamiento escrito en
// scripts/asignaciones.json para poder revisarlo antes de tocar nada.
//
//   node scripts/aplicar-fotos.mjs
//
// Los cambios van al catálogo de verdad (Redis, vía /api/catalog), así que se
// ven en la tienda al instante — no hace falta desplegar.

import fs from 'fs';
import path from 'path';

const SITIO = 'https://eydperu.vercel.app';
const ARCHIVO = path.join(process.cwd(), 'scripts', 'asignaciones.json');

const clave = process.env.ORDERS_ADMIN_KEY || process.argv[2];
if (!clave) {
  console.error('\nFalta la clave de administrador.\n');
  console.error('  node scripts/aplicar-fotos.mjs TU_CLAVE\n');
  process.exit(1);
}

if (!fs.existsSync(ARCHIVO)) {
  console.error('\nNo existe scripts/asignaciones.json.');
  console.error('Ejecuta primero: node scripts/subir-fotos.mjs "carpeta"\n');
  process.exit(1);
}

const asignaciones = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
if (!asignaciones.length) {
  console.error('\nEl archivo de asignaciones está vacío.\n');
  process.exit(1);
}

console.log(`\nVoy a actualizar la foto de ${asignaciones.length} productos:\n`);
asignaciones.forEach((a) => console.log(`  ${a.nombre.padEnd(28)} -> ${a.ruta}`));

// Se lee el catálogo completo para conservar todo lo demás de cada producto:
// guardar solo la foto borraría precios, colores y descripciones.
const res = await fetch(`${SITIO}/api/catalog`, {
  headers: { Authorization: `Bearer ${clave}` },
});
if (!res.ok) {
  console.error(`\nNo se pudo leer el catálogo (HTTP ${res.status}). ¿La clave es correcta?\n`);
  process.exit(1);
}
const { products = [] } = await res.json();

console.log('\nAplicando...\n');
let ok = 0;
let fallos = 0;

for (const a of asignaciones) {
  const producto = products.find((p) => p.id === a.id);
  if (!producto) {
    console.log(`  ✗ ${a.nombre}: ya no existe en el catálogo`);
    fallos++;
    continue;
  }

  const actualizado = { ...producto, baseImage: a.ruta };

  const r = await fetch(`${SITIO}/api/catalog?resource=product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
    body: JSON.stringify(actualizado),
  });

  if (r.ok) {
    console.log(`  ✓ ${a.nombre}`);
    ok++;
  } else {
    const err = await r.json().catch(() => ({}));
    console.log(`  ✗ ${a.nombre}: ${err.error || `HTTP ${r.status}`}`);
    fallos++;
  }
}

console.log(`\n${ok} actualizados${fallos ? `, ${fallos} con problemas` : ''}.\n`);
if (ok) {
  console.log('Las fotos ya se ven en la tienda. Falta subir los archivos al repositorio:');
  console.log('  git add public/productos && git commit -m "Fotos de productos" && git push\n');
}
