// Que las cuentas delicadas no vuelvan a copiarse por ahí.
//
// Hay dos números en este proyecto que, escritos a mano en varios archivos,
// ya han costado dinero:
//
//   · El desfase de Lima (5 horas). Las ofertas morían a las 7 de la tarde y
//     las ventas de fin de mes se contaban en el mes siguiente. Cuando se
//     arregló, la cuenta acabó copiada en CUATRO archivos.
//   · El IGV (18%). Si el panel lo calcula por su cuenta y la declaración por
//     la suya, enseñan márgenes distintos y nadie sabe cuál creer.
//
// Cada uno vive ahora en un solo sitio. Esto vigila que siga así.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function archivosDeCodigo(dir, acc = []) {
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.vercel'].includes(e.name)) continue;
      archivosDeCodigo(rel, acc);
    } else if (/\.(js|jsx)$/.test(e.name)) acc.push(rel);
  }
  return acc;
}

const CODIGO = [...archivosDeCodigo('src'), ...archivosDeCodigo('api')];
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

// Los comentarios no son código: explicar "la base es 310 / 1.18" es
// justamente lo que queremos que siga escrito. Se quitan antes de buscar, o la
// prueba regañaría por documentar bien.
const soloCodigo = (p) =>
  leer(p)
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

test('el desfase de Lima se escribe en un solo archivo', () => {
  const culpables = CODIGO.filter((f) => f !== 'src/lib/lima.js')
    .filter((f) => /5\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(soloCodigo(f)));

  assert.deepEqual(
    culpables,
    [],
    'Estos archivos calculan la hora de Lima por su cuenta: ' + culpables.join(', ') +
      '. Usa diaLima(), mesLima() o anioLima() de src/lib/lima.js — si una copia ' +
      'se queda atrás, las pantallas dejan de cuadrar entre sí.'
  );
});

test('el IGV se calcula en un solo archivo', () => {
  const culpables = CODIGO.filter((f) => f !== 'src/lib/igv.js')
    // Dividir o multiplicar por 1.18 a mano es rehacer la cuenta del IGV.
    .filter((f) => /[/*]\s*1\.18\b/.test(soloCodigo(f)));

  assert.deepEqual(
    culpables,
    [],
    'Estos archivos calculan el IGV por su cuenta: ' + culpables.join(', ') +
      '. Usa separarIGV() o agregarIGV() de src/lib/igv.js.'
  );
});

test('no quedan archivos que nadie importe', () => {
  // Las "entradas" arrancan solas y por eso nunca aparecen importadas.
  const esEntrada = (f) =>
    f === 'src/main.jsx' ||
    /^api\/[^_/]+\.js$/.test(f) ||
    /^api\/_rutas\//.test(f);

  const huerfanos = [];
  for (const f of CODIGO) {
    if (esEntrada(f)) continue;
    const base = path.basename(f);
    const sinExt = base.replace(/\.(jsx?)$/, '');
    const usado = CODIGO.some((otro) => {
      if (otro === f) return false;
      const src = leer(otro);
      return src.includes(`/${base}`) || src.includes(`'./${sinExt}`) || src.includes(`"./${sinExt}`);
    });
    if (!usado) huerfanos.push(f);
  }

  assert.deepEqual(
    huerfanos,
    [],
    'Estos archivos no los importa nadie: ' + huerfanos.join(', ') +
      '. O se usan y falta engancharlos, o sobran y hay que borrarlos. Código ' +
      'muerto que parece vivo hace perder tiempo a quien lo lee.'
  );
});
