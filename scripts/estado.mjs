// Cómo está la tienda ahora mismo, en una pantalla.
//
//   npm run estado
//
// POR QUÉ EXISTE: cada vez que empieza una sesión de trabajo hay que volver a
// averiguar lo mismo — cuántos productos hay, cuántas funciones quedan libres
// en Vercel, si los bots responden, qué falta. Averiguarlo abriendo archivos
// cuesta tiempo y, cuando lo hace un asistente de IA, cuesta dinero: son
// quince o veinte mil fichas de texto en leer cosas que caben en veinte
// líneas.
//
// Esto las imprime. Se lee una vez al empezar y se sabe dónde está todo.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = 'https://eydperu.vercel.app';

const linea = (etiqueta, valor) => console.log(`  ${etiqueta.padEnd(26)} ${valor}`);

function titulo(t) {
  console.log(`\n${t}`);
  console.log('  ' + '─'.repeat(52));
}

// ── Código ──────────────────────────────────────────────────────────────────
titulo('CÓDIGO');

const funciones = fs
  .readdirSync(path.join(RAIZ, 'api'))
  .filter((n) => n.endsWith('.js') && !n.startsWith('_'));
linea('Funciones en Vercel', `${funciones.length} de 12 (quedan ${12 - funciones.length} libres)`);

const rutas = fs.readdirSync(path.join(RAIZ, 'api/_rutas')).filter((n) => n.endsWith('.js'));
linea('Rutas en el despachador', rutas.length);

function contarLineas(dir, acc = { n: 0, archivos: 0 }) {
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) contarLineas(rel, acc);
    else if (/\.(js|jsx|mjs)$/.test(e.name)) {
      acc.n += fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n').length;
      acc.archivos++;
    }
  }
  return acc;
}
const codigo = contarLineas('src');
linea('Código de la tienda', `${codigo.n.toLocaleString('es-PE')} líneas en ${codigo.archivos} archivos`);

// El archivo más grande, porque es el que más cuesta tocar.
const grandes = [];
(function recorrer(dir) {
  for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, e.name);
    if (e.isDirectory()) recorrer(rel);
    else if (/\.(js|jsx)$/.test(e.name))
      grandes.push([rel, fs.readFileSync(path.join(RAIZ, rel), 'utf8').split('\n').length]);
  }
})('src');
grandes.sort((a, b) => b[1] - a[1]);
linea('El más grande', `${grandes[0][0]} (${grandes[0][1]} líneas)`);

try {
  const commit = execSync('git log -1 --format=%h%x20%s', { cwd: RAIZ }).toString().trim();
  const rama = execSync('git rev-parse --abbrev-ref HEAD', { cwd: RAIZ }).toString().trim();
  const sucio = execSync('git status --porcelain', { cwd: RAIZ }).toString().trim();
  linea('Rama', rama + (sucio ? '  (hay cambios sin guardar)' : '  (todo guardado)'));
  linea('Último cambio', commit.slice(0, 60));
} catch {
  linea('Git', 'no disponible');
}

// ── Pruebas ─────────────────────────────────────────────────────────────────
titulo('PRUEBAS');

// El resumen de node --test sale como "ℹ pass 30" / "# pass 30" según la
// versión de Node y el formato de salida. Se aceptan las dos.
function cuenta(salida, que) {
  const m = salida.match(new RegExp('(?:#|\\u2139)\\s*' + que + '\\s+(\\d+)'));
  return m ? m[1] : '?';
}
try {
  const salida = execSync('node --test "pruebas/*.test.js"', { cwd: RAIZ, stdio: 'pipe' }).toString();
  linea('npm test', `${cuenta(salida, 'pass')} pasan · ${cuenta(salida, 'fail')} fallan`);
} catch (err) {
  const salida = (err.stdout || '').toString();
  linea('npm test', `⚠ ${cuenta(salida, 'fail')} FALLAN — corre "npm test" para ver cuáles`);
}

// ── La tienda publicada ─────────────────────────────────────────────────────
titulo('LA TIENDA PUBLICADA');

async function mirar() {
  try {
    const res = await fetch(`${WEB}/api/catalog`, { signal: AbortSignal.timeout(15000) });
    const c = await res.json();
    const visibles = (c.products || []).filter((p) => !p.oculto);
    linea('Productos', `${visibles.length} visibles de ${c.products.length}`);

    const porCat = {};
    for (const p of visibles) porCat[p.category] = (porCat[p.category] || 0) + 1;
    linea('Por categoría', Object.entries(porCat).map(([k, v]) => `${k}: ${v}`).join(' · '));
    linea('Colores y medidas', `${(c.colors || []).length} colores · ${(c.sizes || []).length} medidas`);

    const sinFoto = visibles.filter(
      (p) => !p.baseImage && !Object.keys(p.sizeImages || {}).length && !(p.gallery || []).length
    );
    linea('Sin foto', sinFoto.length === 0 ? 'ninguno' : `${sinFoto.length}: ${sinFoto.map((p) => p.id).join(', ')}`);
  } catch (err) {
    linea('Catálogo', `⚠ no responde (${err.message})`);
  }

  // Los bots se caen solos cuando Groq retira un modelo, y no avisan.
  try {
    const res = await fetch(`${WEB}/api/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hola' }] }),
      signal: AbortSignal.timeout(25000),
    });
    linea('CHAT-ED', res.ok ? 'responde' : `⚠ CAÍDO (${res.status}) — revisa GROQ_MODEL en Vercel`);
  } catch {
    linea('CHAT-ED', '⚠ no responde');
  }
}

await mirar();

// ── Lo que falta ────────────────────────────────────────────────────────────
titulo('PENDIENTE (solo lo puede hacer el dueño)');
console.log('  · Inscribir el banco de datos personales ante la ANPD (gob.pe → MINJUS)');
console.log('  · Crear la ficha de Google del negocio (Google Business Profile)');
console.log('  · Revisar que el token de Upstash tenga los permisos mínimos');

console.log('\n  Comandos:  npm run verificar   (pruebas + compilación)');
console.log('             npm run revisar-tienda  (la web en vivo)');
console.log('             npm run dev        (tienda local en localhost:5173)\n');
