// Recrea el catálogo: colores, tamaños y las 34 cabeceras.
//
//   node scripts/crear-productos.mjs TU_CLAVE
//
// Se perdieron los productos de la base de datos. Los datos los dictó el dueño
// y están en scripts/cabeceras.js y scripts/colores.js.
//
// El orden importa: primero colores y tamaños, porque cada producto los
// referencia por su id. Si un producto apunta a un color que no existe, el
// selector de la ficha sale vacío.
//
// Es seguro repetirlo: cada elemento se crea o se actualiza por su id, no se
// duplica. Con --solo-ver enseña lo que haría sin tocar nada.

import { CABECERAS, PRECIOS, TAMANOS } from './cabeceras.js';
import { COLORES } from './colores.js';

const SITIO = 'https://eydperu.vercel.app';
const clave = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);
const soloVer = process.argv.includes('--solo-ver');

if (!clave) {
  console.error('\nFalta la clave de administrador:\n  node scripts/crear-productos.mjs TU_CLAVE\n');
  process.exit(1);
}

const cabecera = { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` };

async function guardar(recurso, objeto) {
  const r = await fetch(`${SITIO}/api/catalog?resource=${recurso}`, {
    method: 'POST',
    headers: cabecera,
    body: JSON.stringify(objeto),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${r.status}`);
  }
}

async function borrar(recurso, id) {
  await fetch(`${SITIO}/api/catalog?resource=${recurso}&id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: cabecera,
  });
}

// Cada cabecera se vende en los 4 tamaños, cada uno a su precio. La foto se
// tiñe con el color que elija el cliente (tintable), que es como funcionan
// todas: son telas lisas.
function construirProducto(c) {
  return {
    id: c.id,
    category: 'cabeceras',
    name: c.name,
    shortDescription: c.descripcion,
    baseImage: c.foto || '',
    tintable: true,
    sizePricing: { ...PRECIOS },
    availableColors: COLORES.map((x) => x.id),
    specs: {},
  };
}

console.log(`\n${soloVer ? '[SOLO VER] ' : ''}Recreando el catálogo en ${SITIO}\n`);
console.log(`  ${COLORES.length} colores`);
console.log(`  ${TAMANOS.length} tamaños`);
console.log(`  ${CABECERAS.length} cabeceras`);
console.log(`  precios: ${TAMANOS.map((t) => `${t.label} S/${t.precio}`).join(' · ')}\n`);

const sinFoto = CABECERAS.filter((c) => !c.foto);
if (sinFoto.length) {
  console.log(`  ⚠ ${sinFoto.length} sin foto todavía — se crean igual y la foto se pone después.\n`);
}

if (soloVer) {
  console.log('No se tocó nada. Quita --solo-ver para aplicarlo.\n');
  process.exit(0);
}

// --- Colores ---
// Se quitan primero los que ya no se venden (roble, nogal, los velvet...), o
// quedarían mezclados con los reales en el selector del cliente.
const actual = await fetch(`${SITIO}/api/catalog`, { headers: cabecera }).then((r) => r.json());
const nuevosIds = new Set(COLORES.map((c) => c.id));
const sobran = (actual.colors || []).filter((c) => !nuevosIds.has(c.id));

if (sobran.length) {
  console.log(`Quitando ${sobran.length} colores que ya no se usan...`);
  for (const c of sobran) await borrar('color', c.id);
}

console.log('Colores...');
for (const c of COLORES) {
  await guardar('color', c);
  process.stdout.write(`  ${c.label}\n`);
}

// --- Tamaños ---
console.log('\nTamaños...');
for (const t of TAMANOS) {
  await guardar('size', { id: t.id, label: t.label, dims: t.dims });
  console.log(`  ${t.label}  ${t.dims}`);
}

// --- Cabeceras ---
console.log('\nCabeceras...');
let ok = 0;
const fallos = [];
for (const c of CABECERAS) {
  try {
    await guardar('product', construirProducto(c));
    console.log(`  ✓ ${c.name}`);
    ok++;
  } catch (err) {
    console.log(`  ✗ ${c.name}: ${err.message}`);
    fallos.push(c.name);
  }
}

console.log(`\n${ok} de ${CABECERAS.length} cabeceras creadas.`);
if (fallos.length) console.log(`Fallaron: ${fallos.join(', ')}`);
console.log(`\nRevísalo en ${SITIO}/tienda\n`);
