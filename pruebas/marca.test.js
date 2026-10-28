// La marca tiene que estar en UN solo sitio, y las imágenes que se prometen
// tienen que existir.
//
// Los dos fallos que esto evita pasaron de verdad, el mismo día:
//
// 1. Al cambiar el nombre a "Corporación Agamenón" se repasó toda la carpeta
//    src/, pero no api/. Quedaron SEIS sitios con el nombre viejo, y el peor
//    era el que más se ve: la tarjeta que sale al compartir un producto por
//    WhatsApp seguía diciendo "E|D Espacios y Diseño". Nada falla, nada avisa:
//    simplemente la tienda se presenta con un nombre que ya no existe.
//
// 2. Al renombrar la imagen de compartir (og-image.png -> og-agamenon.png)
//    quedó una referencia al nombre viejo en el servidor. Esa es la imagen de
//    respaldo cuando se comparte un producto que no está en el catálogo: no
//    habría salido ninguna imagen y nadie se habría enterado.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

// Nombres que la tienda YA NO usa. Si algún día vuelve a cambiar de nombre,
// añade el anterior aquí: es lo que convierte este descuido en un fallo
// visible en vez de en un nombre viejo escondido durante meses.
const NOMBRES_MUERTOS = ['E|D Espacios y Diseño', 'ESPACIOS Y DISEÑO'];

// Archivos donde SÍ puede aparecer un nombre viejo: esta prueba y la memoria
// de por qué se cambió.
const PERDONADOS = ['pruebas/marca.test.js'];

function archivosDeCodigo(dir, acc = []) {
  for (const entrada of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entrada.name}`;
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules') continue;
      archivosDeCodigo(rel, acc);
    } else if (/\.(js|jsx|html)$/.test(entrada.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

test('no queda ningún nombre viejo de la marca en el código', () => {
  const archivos = [...archivosDeCodigo('src'), ...archivosDeCodigo('api'), 'index.html'];
  const culpables = [];

  for (const rel of archivos) {
    if (PERDONADOS.includes(rel)) continue;
    const texto = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
    for (const viejo of NOMBRES_MUERTOS) {
      if (texto.includes(viejo)) culpables.push(`${rel} → "${viejo}"`);
    }
  }

  assert.deepEqual(
    culpables,
    [],
    'Estos archivos siguen con un nombre que la tienda ya no usa. El nombre ' +
      'sale de NOMBRE_TIENDA en src/data/sitio.js:\n  ' + culpables.join('\n  ')
  );
});

test('las imágenes que se prometen al compartir existen de verdad', () => {
  // De dónde se sacan: index.html las declara para la portada, y
  // api/_rutas/compartir.js la usa de respaldo para un producto sin foto.
  const fuentes = ['index.html', 'api/_rutas/compartir.js', 'src/lib/meta.js'];
  const faltan = [];

  for (const rel of fuentes) {
    // Se quita el dominio primero, así da igual que la dirección esté escrita
    // entera ("https://eydperu.vercel.app/og-agamenon.png", como en las
    // etiquetas que lee Facebook) o como ruta suelta ("/favicon.svg").
    const texto = fs
      .readFileSync(path.join(RAIZ, rel), 'utf8')
      .replaceAll('https://eydperu.vercel.app', '');

    // Solo rutas de verdad: tienen que empezar por "/" y venir justo después
    // de una comilla, un igual o el cierre de un ${...}. Sin esa exigencia,
    // un trozo de texto como el '-og.jpg' de un `replace()` se contaba como
    // si fuera un archivo, y la prueba fallaba sin que nada estuviera mal.
    for (const m of texto.matchAll(/["'`}=]\/((?:[\w-]+\/)*[\w-]+\.(?:png|jpe?g|svg|webp))(?=["'`\s>)])/g)) {
      const archivo = m[1];
      // Las fotos de producto las sube el dueño desde el panel: no tienen por
      // qué estar en el repositorio.
      if (archivo.startsWith('productos/') || archivo.startsWith('images/')) continue;
      if (!fs.existsSync(path.join(RAIZ, 'public', archivo))) {
        faltan.push(`${rel} promete /${archivo}, que no está en public/`);
      }
    }
  }

  assert.deepEqual(faltan, [], faltan.join('\n  '));
});

// Y index.html tiene que decir la MISMA dirección que el resto del proyecto.
//
// POR QUÉ: la dirección de la tienda estaba escrita a mano en siete archivos.
// Ahora vive en uno solo (SITIO_URL en src/data/sitio.js) y todos la leen de
// ahí — todos menos index.html, que es HTML estático y no puede importar nada.
//
// Ese archivo es justo el que leen Facebook y WhatsApp para la vista previa de
// la portada. Si al cambiar de dominio se queda con el viejo, la tienda sigue
// funcionando, nadie ve un error, y las tarjetas al compartir apuntan a una
// web que ya no existe. Esta prueba es lo único que lo caza.
test('index.html apunta a la misma dirección que el resto del proyecto', () => {
  const sitio = leer('src/data/sitio.js').match(/SITIO_URL = '([^']+)'/);
  assert.ok(sitio, 'no encontré SITIO_URL en src/data/sitio.js');
  const esperada = sitio[1];

  const html = leer('index.html');
  const direcciones = [...html.matchAll(/content="(https?:\/\/[^"/]+)/g)].map((m) => m[1]);
  const ajenas = [...new Set(direcciones)].filter((d) => d !== esperada);

  assert.deepEqual(
    ajenas,
    [],
    `index.html nombra ${ajenas.join(', ')} pero la tienda vive en ${esperada}. ` +
      `Cámbialo en index.html (og:image, og:url y twitter:image).`
  );
});
