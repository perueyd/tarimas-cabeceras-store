// Pone las fotos de los productos DENTRO del proyecto, en vez de en el almacén
// de Vercel Blob.
//
// Por qué: el almacén de Blob tiene 10 GB de transferencia gratis al mes y se
// agotaron, así que Vercel lo bloqueó y las 33 fotos dejaron de verse. Los
// archivos que viven en `public/` se sirven por otra cuota — la de datos
// estáticos, de 100 GB, que está usada al 0,3%. Diez veces más grande y
// prácticamente vacía.
//
// Cómo se usa:
//   node scripts/subir-fotos.mjs "C:\ruta\a\tus\fotos"
//
// El script:
//  1. Lee las imágenes de esa carpeta.
//  2. Las encoge a 1600 px de ancho y las convierte a WebP (mucho más liviano
//     que PNG, y conserva la transparencia que necesita "Ver en mi pared").
//  3. Las guarda en public/productos/ con un nombre limpio.
//  4. Dice qué producto del catálogo le corresponde a cada una, comparando el
//     nombre del archivo con el nombre del producto.
//
// No toca el catálogo por su cuenta: al final imprime lo que hay que cambiar,
// para que nada se modifique sin que se vea antes.

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ANCHO_MAX = 1600;
const CALIDAD = 82;
const DESTINO = path.join(process.cwd(), 'public', 'productos');

const origen = process.argv[2];
if (!origen) {
  console.error('\nFalta la carpeta con las fotos.\n');
  console.error('  Ejemplo: node scripts/subir-fotos.mjs "C:\\Users\\HP\\Desktop\\fotos"\n');
  process.exit(1);
}
if (!fs.existsSync(origen)) {
  console.error(`\nNo encuentro esa carpeta:\n  ${origen}\n`);
  process.exit(1);
}

// "1 MILÁN 2 PLAZAS.png" -> "milan-2-plazas"
function limpiarNombre(archivo) {
  return path
    .basename(archivo, path.extname(archivo))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .toLowerCase()
    .replace(/^\d+[\s.-]*/, '') // quita el número del principio ("1 MILÁN" -> "milan")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Para emparejar el archivo con un producto del catálogo.
function normalizar(t) {
  return String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const EXTENSIONES = /\.(png|jpe?g|webp)$/i;
const fotos = fs.readdirSync(origen).filter((f) => EXTENSIONES.test(f));

if (!fotos.length) {
  console.error(`\nNo hay imágenes (.png, .jpg, .webp) en:\n  ${origen}\n`);
  process.exit(1);
}

fs.mkdirSync(DESTINO, { recursive: true });

console.log(`\nProcesando ${fotos.length} fotos...\n`);

let pesoOriginal = 0;
let pesoFinal = 0;
const resultados = [];

for (const foto of fotos) {
  const entrada = path.join(origen, foto);
  const nombre = limpiarNombre(foto);
  const salida = path.join(DESTINO, `${nombre}.webp`);

  try {
    const info = await sharp(entrada).metadata();
    const original = fs.statSync(entrada).size;

    await sharp(entrada)
      .resize({ width: ANCHO_MAX, withoutEnlargement: true })
      .webp({ quality: CALIDAD, alphaQuality: 100 }) // alpha al máximo: el fondo transparente es lo que hace que se vea el mueble y no un recuadro
      .toFile(salida);

    const final = fs.statSync(salida).size;
    pesoOriginal += original;
    pesoFinal += final;

    const aviso = info.width < ANCHO_MAX ? `  ⚠ solo ${info.width}px de ancho` : '';
    console.log(
      `  ${foto}\n    -> /productos/${nombre}.webp  (${(original / 1048576).toFixed(1)} MB -> ${Math.round(final / 1024)} KB)${aviso}`
    );

    resultados.push({ archivo: foto, nombre, ruta: `/productos/${nombre}.webp`, ancho: info.width });
  } catch (err) {
    console.log(`  ${foto}\n    ✗ no se pudo procesar: ${err.message}`);
  }
}

console.log(
  `\nTotal: ${(pesoOriginal / 1048576).toFixed(1)} MB -> ${(pesoFinal / 1048576).toFixed(1)} MB` +
    ` (${Math.round((1 - pesoFinal / pesoOriginal) * 100)}% menos)\n`
);

// --- Emparejar con los productos del catálogo ---
try {
  const res = await fetch('https://eydperu.vercel.app/api/catalog');
  const { products = [] } = await res.json();
  const visibles = products.filter((p) => !p.oculto);

  const asignaciones = [];
  const sinFoto = [];

  for (const p of visibles) {
    const clave = normalizar(p.name);
    const match = resultados.find((r) => {
      const rn = normalizar(r.nombre);
      return rn.includes(clave) || clave.includes(rn);
    });
    if (match) asignaciones.push({ id: p.id, nombre: p.name, ruta: match.ruta });
    else sinFoto.push(p.name);
  }

  console.log(`Emparejadas ${asignaciones.length} de ${visibles.length} productos.\n`);

  if (sinFoto.length) {
    console.log('SIN FOTO (revisa el nombre del archivo):');
    sinFoto.forEach((n) => console.log(`  - ${n}`));
    console.log('');
  }

  const usadas = new Set(asignaciones.map((a) => a.ruta));
  const sobran = resultados.filter((r) => !usadas.has(r.ruta));
  if (sobran.length) {
    console.log('FOTOS QUE NO ENCAJARON CON NINGÚN PRODUCTO:');
    sobran.forEach((r) => console.log(`  - ${r.archivo}`));
    console.log('');
  }

  fs.writeFileSync(
    path.join(process.cwd(), 'scripts', 'asignaciones.json'),
    JSON.stringify(asignaciones, null, 2),
    'utf8'
  );
  console.log('Guardado scripts/asignaciones.json con el emparejamiento.\n');
  console.log('Siguiente paso: node scripts/aplicar-fotos.mjs\n');
} catch (err) {
  console.log(`No se pudo leer el catálogo para emparejar (${err.message}).`);
  console.log('Las fotos ya están en public/productos/; el emparejamiento habrá que hacerlo a mano.\n');
}
