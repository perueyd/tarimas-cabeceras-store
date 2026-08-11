// Sube TUS fotos a la tienda eligiendo tú mismo a qué producto va cada una.
//
// POR QUÉ EXISTE: el almacén de fotos de Vercel (Blob) está bloqueado por haber
// pasado los 10 GB gratis, así que el botón "Subir foto" del panel no funciona.
// Las fotos que viven dentro del proyecto (carpeta public/) se sirven por otra
// cuota distinta —100 GB, casi sin usar— y no dependen de ese almacén.
//
// No adivina nada: abre una página en tu navegador donde ves cada foto y eliges
// tú el producto y el tamaño.
//
// CÓMO SE USA:
//   node scripts/elegir-fotos.mjs "C:\ruta\a\tus\fotos"
//
// Luego abre http://localhost:4321 en el navegador, elige y pulsa "Guardar".
// El script se encarga de: encoger las fotos, subirlas al repositorio (para que
// se vean en internet) y apuntar cada producto a su foto.

import fs from 'fs';
import path from 'path';
import http from 'http';
import { execFile } from 'child_process';
import sharp from 'sharp';

// La tienda de verdad. Se puede apuntar a otra (una copia de prueba) con la
// variable TIENDA_URL, para no tocar la tienda real mientras se prueba algo.
const SITIO = process.env.TIENDA_URL || 'https://eydperu.vercel.app';
const PUERTO = 4321;
const ANCHO_MAX = 1600;
const CALIDAD = 82;
const ANCHO_CHICO = 500; // la que se ve en el catálogo
const CALIDAD_CHICA = 72;
const RAIZ = process.cwd();
const DESTINO = path.join(RAIZ, 'public', 'productos');
// Marca para "esta foto va a la galería del producto" (fotos adicionales, no
// una foto de tamaño). No puede chocar con el id de un tamaño real.
const GALERIA = '__galeria__';

// ---------- 1. Datos de entrada ----------
const origen = process.argv[2];
if (!origen) {
  console.error('\nFalta la carpeta con tus fotos.\n');
  console.error('  Ejemplo: node scripts/elegir-fotos.mjs "C:\\Users\\HP\\Desktop\\fotos"\n');
  process.exit(1);
}
if (!fs.existsSync(origen)) {
  console.error(`\nNo encuentro esa carpeta:\n  ${origen}\n`);
  process.exit(1);
}

function claveAdmin() {
  if (process.argv[3]) return process.argv[3].trim();
  if (process.env.ORDERS_ADMIN_KEY) return process.env.ORDERS_ADMIN_KEY.trim();
  try {
    const txt = fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8');
    const m = /^ORDERS_ADMIN_KEY=(.*)$/m.exec(txt);
    if (m) return m[1].trim();
  } catch {
    /* sin .env.local */
  }
  return '';
}
const CLAVE = claveAdmin();
if (!CLAVE) {
  console.error('\nNo encontré la clave de administrador.');
  console.error('  Ponla al final:  node scripts/elegir-fotos.mjs "C:\\ruta\\fotos" TU_CLAVE\n');
  process.exit(1);
}

// ---------- 2. Convertir las fotos ----------
// Se pasan a WebP y se encogen: una foto de celular pesa 4 MB y en la web se ve
// igual con 200 KB. La transparencia se conserva al máximo, porque es lo que
// hace que el mueble se vea recortado y no dentro de un recuadro blanco.
function limpiarNombre(archivo) {
  return path
    .basename(archivo, path.extname(archivo))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^\d+[\s.-]*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function normalizar(t) {
  return String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const EXTENSIONES = /\.(png|jpe?g|webp)$/i;
const archivos = fs.readdirSync(origen).filter((f) => EXTENSIONES.test(f));
if (!archivos.length) {
  console.error(`\nNo hay imágenes (.png, .jpg, .webp) en:\n  ${origen}\n`);
  process.exit(1);
}
fs.mkdirSync(DESTINO, { recursive: true });

console.log(`\nPreparando ${archivos.length} fotos...\n`);
const fotos = [];
let pesoAntes = 0;
let pesoDespues = 0;

// Dos fotos del mismo modelo y tamaño ("11 MONARCA 1 1_2" y "12 MONARCA 1 1_2")
// dan el mismo nombre limpio al quitarles el número del principio, y la segunda
// pisaba a la primera: 65 fotos se convertían en 49 archivos y 16 se perdían en
// silencio. Con el sufijo cada foto conserva su archivo.
const nombresUsados = new Set();
function nombreLibre(archivo) {
  const base = limpiarNombre(archivo) || 'foto';
  let nombre = base;
  let n = 2;
  while (nombresUsados.has(nombre)) nombre = `${base}-${n++}`;
  nombresUsados.add(nombre);
  return nombre;
}

for (const archivo of archivos) {
  const entrada = path.join(origen, archivo);
  const nombre = nombreLibre(archivo);
  const salida = path.join(DESTINO, `${nombre}.webp`);
  const yaExistia = fs.existsSync(salida);
  try {
    const info = await sharp(entrada).metadata();
    const antes = fs.statSync(entrada).size;
    await sharp(entrada)
      .resize({ width: ANCHO_MAX, withoutEnlargement: true })
      .webp({ quality: CALIDAD, alphaQuality: 100 })
      .toFile(salida);
    // Gemela liviana para el catálogo, donde se cargan las 34 de golpe: en una
    // tarjeta de 300 px no se nota, y baja la pagina de varios megas a uno.
    await sharp(entrada)
      .resize({ width: ANCHO_CHICO, withoutEnlargement: true })
      .webp({ quality: CALIDAD_CHICA, alphaQuality: 100 })
      .toFile(path.join(DESTINO, `${nombre}-sm.webp`));
    const despues = fs.statSync(salida).size;
    pesoAntes += antes;
    pesoDespues += despues;
    fotos.push({
      archivo,
      nombre,
      ruta: `/productos/${nombre}.webp`,
      ancho: info.width,
      nueva: !yaExistia, // para poder borrar las que al final no uses
      chica: info.width < 900,
    });
    console.log(`  ✓ ${archivo}  (${(antes / 1048576).toFixed(1)} MB → ${Math.round(despues / 1024)} KB)`);
  } catch (err) {
    console.log(`  ✗ ${archivo}: ${err.message}`);
  }
}
if (!fotos.length) {
  console.error('\nNinguna foto se pudo procesar.\n');
  process.exit(1);
}
console.log(
  `\nTotal: ${(pesoAntes / 1048576).toFixed(1)} MB → ${(pesoDespues / 1048576).toFixed(1)} MB\n`
);

// ---------- 3. Leer el catálogo de verdad ----------
async function leerCatalogo() {
  const res = await fetch(`${SITIO}/api/catalog`, { headers: { Authorization: `Bearer ${CLAVE}` } });
  if (!res.ok) throw new Error(`no se pudo leer el catálogo (HTTP ${res.status}) — ¿la clave es correcta?`);
  return res.json();
}

let catalogo;
try {
  catalogo = await leerCatalogo();
} catch (err) {
  console.error(`\n${err.message}\n`);
  process.exit(1);
}

const productos = (catalogo.products || []).map((p) => ({
  id: p.id,
  nombre: p.name,
  oculto: Boolean(p.oculto),
  tieneFoto: Boolean(p.baseImage),
  tamanos: (catalogo.sizes || [])
    .filter((s) => p.sizePricing?.[s.id] != null)
    .map((s) => ({ id: s.id, label: s.label, tieneFoto: Boolean(p.sizeImages?.[s.id]) })),
}));

// Cómo se escribe el tamaño en los nombres de archivo. "1 1_2" y "1 1/2" son la
// misma "1 Plaza y Media", pero escritas así no se parecen en nada a la
// etiqueta del catálogo, y sin esto ninguna foto de ese tamaño se emparejaría.
const ALIAS_TAMANO = [
  { enElArchivo: /112|1½|15plaza/, enLaEtiqueta: /media|15/ },
  { enElArchivo: /2plaza|dosplaza/, enLaEtiqueta: /2plaza/ },
];

function adivinarTamano(clave, tamanos) {
  const directo = tamanos.find((s) => clave.includes(normalizar(s.label)));
  if (directo) return directo;
  for (const a of ALIAS_TAMANO) {
    if (!a.enElArchivo.test(clave)) continue;
    const t = tamanos.find((s) => a.enLaEtiqueta.test(normalizar(s.label)));
    if (t) return t;
  }
  return null;
}

// Propuesta inicial: se compara el nombre del archivo con el del producto y con
// las etiquetas de tamaño. Es solo una SUGERENCIA — en la página se cambia con
// dos clics, que es justo lo que se pidió.
for (const f of fotos) {
  const clave = normalizar(f.nombre);
  const candidatos = productos
    .filter((p) => {
      const n = normalizar(p.nombre);
      return n.length > 2 && (clave.includes(n) || n.includes(clave));
    })
    .sort((a, b) => normalizar(b.nombre).length - normalizar(a.nombre).length);
  const elegido = candidatos[0];
  f.productId = elegido ? elegido.id : '';
  f.sizeId = '';
  if (elegido) {
    const tam = adivinarTamano(clave, elegido.tamanos);
    if (tam) f.sizeId = tam.id;
  }
}

// Cuando hay VARIAS fotos del mismo modelo y el mismo tamaño (otro ángulo, un
// detalle), la segunda pisaría a la primera. Se propone dejar la primera como
// la foto de ese tamaño y las demás como fotos adicionales de la galería.
for (const p of productos) {
  const suyas = fotos.filter((f) => f.productId === p.id);
  const vistos = new Set();
  for (const f of suyas) {
    const destino = f.sizeId || 'principal';
    if (vistos.has(destino)) f.sizeId = GALERIA;
    else vistos.add(destino);
  }
}
// Nota: no hace falta quitarle el tamaño a ninguna para que haya foto de
// portada — al guardar, si el producto no tiene foto principal se usa la
// primera SIN robarle su tamaño (la misma foto sirve para las dos cosas).

// ---------- 4. La página para elegir ----------
function paginaHTML() {
  const datos = JSON.stringify({ fotos, productos, GALERIA }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Elige a qué producto va cada foto</title>
<style>
 *{box-sizing:border-box} body{margin:0;font:16px/1.5 system-ui,Segoe UI,sans-serif;background:#f6f6f5;color:#1b1b1a}
 header{background:#fff;padding:20px 24px;border-bottom:1px solid #e4e4e2}
 h1{margin:0 0 6px;font-size:22px} .sub{color:#6b6b68;font-size:14px;margin:0}
 .aviso{margin:16px 24px 0;background:#fff8e6;border:1px solid #f2dfa8;border-radius:10px;padding:12px 14px;font-size:14px}
 .rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;padding:18px 24px 140px}
 .tarjeta{background:#fff;border:1px solid #e4e4e2;border-radius:12px;padding:12px}
 .tarjeta.sinusar{opacity:.55}
 .foto{width:100%;height:170px;object-fit:contain;background:
   linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%),
   linear-gradient(45deg,#eee 25%,transparent 25%,transparent 75%,#eee 75%);
   background-size:16px 16px;background-position:0 0,8px 8px;border-radius:8px;cursor:zoom-in}
 .nombre{font-size:12px;color:#6b6b68;margin:8px 0 10px;word-break:break-all}
 label{display:block;font-size:12px;font-weight:600;margin:8px 0 3px}
 select{width:100%;padding:8px;border:1px solid #cfcfcc;border-radius:8px;font-size:14px;background:#fff}
 .chica{margin-top:8px;font-size:12px;color:#a15c00}
 footer{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #e4e4e2;padding:14px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
 button{background:#1b1b1a;color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:16px;font-weight:600;cursor:pointer}
 button:disabled{opacity:.5;cursor:default}
 #estado{font-size:14px;color:#6b6b68}
 #salida{white-space:pre-wrap;font:13px/1.5 ui-monospace,Consolas,monospace;background:#fff;border:1px solid #e4e4e2;border-radius:10px;margin:0 24px;padding:14px;display:none}
</style></head><body>
<header>
 <h1>Elige a qué producto va cada foto</h1>
 <p class="sub">Cambia lo que no esté bien y pulsa <strong>Guardar y publicar</strong>. Lo que dejes en «No usar» no se sube.</p>
</header>
<div class="aviso">
 Las fotos se guardan <strong>dentro de tu proyecto</strong> (no en el almacén bloqueado) y se publican en GitHub.
 Tardan <strong>1 o 2 minutos</strong> en verse en la web mientras Vercel republica la página.
</div>
<div id="salida"></div>
<div class="rejilla" id="rejilla"></div>
<footer>
 <button id="guardar">Guardar y publicar</button>
 <span id="estado"></span>
</footer>
<script>
const DATOS = ${datos};
const rejilla = document.getElementById('rejilla');

function opcionesDestino(prodId, sizeId) {
  const p = DATOS.productos.find(x => x.id === prodId);
  let html = '<option value="">Foto principal (todos los tamaños)</option>';
  if (p) for (const s of p.tamanos) {
    html += '<option value="' + s.id + '"' + (s.id === sizeId ? ' selected' : '') + '>Solo para ' + s.label + '</option>';
  }
  html += '<option value="' + DATOS.GALERIA + '"' + (sizeId === DATOS.GALERIA ? ' selected' : '') +
          '>Foto adicional (otro ángulo)</option>';
  return html;
}

DATOS.fotos.forEach((f, i) => {
  const div = document.createElement('div');
  div.className = 'tarjeta' + (f.productId ? '' : ' sinusar');
  div.innerHTML =
    '<img class="foto" src="/foto/' + encodeURIComponent(f.nombre) + '.webp" onclick="window.open(this.src)">' +
    '<div class="nombre">' + f.archivo + '</div>' +
    '<label>Producto</label><select data-i="' + i + '" class="prod"><option value="">— No usar esta foto —</option>' +
      DATOS.productos.map(p => '<option value="' + p.id + '"' + (p.id === f.productId ? ' selected' : '') + '>' +
        p.nombre + (p.oculto ? ' (oculto)' : '') + '</option>').join('') +
    '</select>' +
    '<label>¿Dónde va?</label><select data-i="' + i + '" class="dest">' + opcionesDestino(f.productId, f.sizeId) + '</select>' +
    (f.chica ? '<div class="chica">⚠ Esta foto es chica (' + f.ancho + 'px): se verá borrosa al ampliar.</div>' : '');
  rejilla.appendChild(div);
});

rejilla.addEventListener('change', (e) => {
  const i = Number(e.target.dataset.i);
  if (e.target.classList.contains('prod')) {
    DATOS.fotos[i].productId = e.target.value;
    DATOS.fotos[i].sizeId = '';
    const dest = rejilla.querySelectorAll('.dest')[i];
    dest.innerHTML = opcionesDestino(e.target.value, '');
    e.target.closest('.tarjeta').className = 'tarjeta' + (e.target.value ? '' : ' sinusar');
  } else {
    DATOS.fotos[i].sizeId = e.target.value;
  }
  contar();
});

function contar() {
  const n = DATOS.fotos.filter(f => f.productId).length;
  document.getElementById('estado').textContent = n + ' de ' + DATOS.fotos.length + ' fotos se van a usar';
}
contar();

document.getElementById('guardar').addEventListener('click', async () => {
  const boton = document.getElementById('guardar');
  const salida = document.getElementById('salida');
  boton.disabled = true;
  document.getElementById('estado').textContent = 'Publicando… esto tarda un poco, no cierres la ventana.';
  salida.style.display = 'block';
  salida.textContent = 'Trabajando…';
  try {
    const r = await fetch('/guardar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asignaciones: DATOS.fotos.map(f => ({ ruta: f.ruta, nombre: f.nombre, nueva: f.nueva, productId: f.productId, sizeId: f.sizeId })) }),
    });
    const res = await r.json();
    salida.textContent = res.informe || JSON.stringify(res);
    document.getElementById('estado').textContent = res.ok ? '✓ Listo' : 'Hubo problemas — mira el detalle arriba';
  } catch (err) {
    salida.textContent = 'Falló: ' + err.message;
  }
  boton.disabled = false;
});
</script></body></html>`;
}

// ---------- 5. Guardar: publicar las fotos y apuntar los productos ----------
// Imagen de 1200x630 en JPG para la vista previa al compartir por WhatsApp.
// En JPG y con fondo blanco a propósito: WhatsApp no siempre muestra las WebP,
// y el JPG no admite transparencia (sin el fondo, el mueble saldría en negro).
async function imagenParaCompartir(nombre) {
  const origen = path.join(DESTINO, `${nombre}.webp`);
  if (!fs.existsSync(origen)) return;
  try {
    await sharp(origen)
      .resize(1200, 630, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 82 })
      .toFile(path.join(DESTINO, `${nombre}-og.jpg`));
  } catch {
    // Sin esta imagen la vista previa sale con la foto genérica de la tienda;
    // no es motivo para abortar la subida.
  }
}

function correr(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: RAIZ }, (err, stdout, stderr) => {
      resolve({ ok: !err, salida: `${stdout || ''}${stderr || ''}`.trim() });
    });
  });
}

async function guardar(asignaciones) {
  const lineas = [];
  const usadas = asignaciones.filter((a) => a.productId);
  const descartadas = asignaciones.filter((a) => !a.productId && a.nueva);

  if (!usadas.length) return { ok: false, informe: 'No elegiste ninguna foto.' };

  // Las que no vas a usar y se crearon en esta pasada se borran, para no dejar
  // basura en el repositorio.
  for (const d of descartadas) {
    try {
      fs.unlinkSync(path.join(DESTINO, `${d.nombre}.webp`));
    } catch {
      /* ya no estaba */
    }
  }
  if (descartadas.length) {
    lineas.push(
      descartadas.length === 1
        ? 'Descartada 1 foto que no elegiste.'
        : `Descartadas ${descartadas.length} fotos que no elegiste.`
    );
  }

  // PRIMERO se publican los archivos: si se apuntara el catálogo antes, los
  // clientes verían fotos rotas hasta que Vercel terminara de republicar.
  lineas.push('', 'Publicando las fotos en el repositorio...');
  // Se suben las tres versiones de cada foto: la grande, la liviana del
  // catálogo y (solo si es foto principal) la de compartir. Se comprueba que
  // cada archivo exista porque `git add` falla ENTERO —y no sube nada— si se
  // le nombra uno que no está.
  const aSubir = usadas
    .flatMap((a) => [`${a.nombre}.webp`, `${a.nombre}-sm.webp`, `${a.nombre}-og.jpg`])
    .filter((f) => fs.existsSync(path.join(DESTINO, f)))
    .map((f) => `public/productos/${f}`);
  await correr('git', ['add', '--', ...aSubir]);
  const commit = await correr('git', ['commit', '-m', `Fotos de productos (${usadas.length})`]);
  if (!commit.ok && !/nothing to commit/i.test(commit.salida)) {
    lineas.push(`  ⚠ No se pudo guardar el commit: ${commit.salida.split('\n')[0]}`);
  }
  const push = await correr('git', ['push']);
  if (push.ok) lineas.push('  ✓ Fotos publicadas. Vercel las estará republicando (1-2 minutos).');
  else {
    lineas.push(`  ✗ No se pudieron publicar: ${push.salida.split('\n').slice(-2).join(' ')}`);
    lineas.push('    Las fotos están en tu PC pero NO en internet todavía.');
    return { ok: false, informe: lineas.join('\n') };
  }

  // Ahora sí, apuntar cada producto a su foto. Se relee el catálogo para no
  // pisar cambios hechos desde el panel mientras elegías.
  lineas.push('', 'Apuntando cada producto a su foto...');
  const fresco = await leerCatalogo();
  const porProducto = new Map();
  for (const a of usadas) {
    if (!porProducto.has(a.productId)) porProducto.set(a.productId, []);
    porProducto.get(a.productId).push(a);
  }

  let ok = 0;
  let fallos = 0;
  for (const [productId, lista] of porProducto) {
    const original = (fresco.products || []).find((p) => p.id === productId);
    if (!original) {
      lineas.push(`  ✗ ${productId}: ya no existe en el catálogo`);
      fallos++;
      continue;
    }
    // La galería puede venir como lista de URLs sueltas (productos viejos) o de
    // objetos { url, tintable }; se normaliza para no romper las que ya había.
    const galeriaPrevia = (original.gallery || []).map((g) =>
      typeof g === 'string' ? { url: g, tintable: false } : g
    );
    const actualizado = {
      ...original,
      sizeImages: { ...(original.sizeImages || {}) },
      gallery: galeriaPrevia,
    };
    const detalle = [];
    let extras = 0;
    for (const a of lista) {
      if (a.sizeId === GALERIA) {
        // Sin repetir: volver a correr el script no debe duplicar la galería.
        if (!actualizado.gallery.some((g) => g.url === a.ruta)) {
          actualizado.gallery.push({ url: a.ruta, tintable: false });
        }
        extras++;
      } else if (a.sizeId) {
        actualizado.sizeImages[a.sizeId] = a.ruta;
        detalle.push(`tamaño ${a.sizeId}`);
      } else {
        actualizado.baseImage = a.ruta;
        detalle.push('foto principal');
        await imagenParaCompartir(a.nombre);
      }
    }
    if (extras) detalle.push(`${extras} foto${extras === 1 ? '' : 's'} adicional${extras === 1 ? '' : 'es'}`);
    // Un producto sin foto principal sale vacío en el catálogo y en las
    // recomendaciones, aunque tenga fotos por tamaño: se usa la primera (sin
    // quitársela a su tamaño — la misma foto vale para las dos cosas).
    // También se reemplaza si la que tenía apunta al almacén bloqueado, porque
    // esa dirección devuelve 403 y se ve rota.
    const rota = /blob\.vercel-storage\.com/.test(actualizado.baseImage || '');
    if (!actualizado.baseImage || rota) {
      actualizado.baseImage = lista[0].ruta;
      detalle.push('(también como principal)');
    }

    const r = await fetch(`${SITIO}/api/catalog?resource=product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CLAVE}` },
      body: JSON.stringify(actualizado),
    });
    if (r.ok) {
      lineas.push(`  ✓ ${original.name}: ${detalle.join(', ')}`);
      ok++;
    } else {
      const err = await r.json().catch(() => ({}));
      lineas.push(`  ✗ ${original.name}: ${err.error || `HTTP ${r.status}`}`);
      fallos++;
    }
  }

  lineas.push(
    '',
    `${ok} producto${ok === 1 ? '' : 's'} actualizado${ok === 1 ? '' : 's'}${fallos ? `, ${fallos} con problemas` : ''}.`
  );
  lineas.push('Mira tu tienda en 1-2 minutos: ' + SITIO + '/tienda');
  return { ok: fallos === 0, informe: lineas.join('\n') };
}

// ---------- 6. Servidor local ----------
const servidor = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(paginaHTML());
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/foto/')) {
    const nombre = path.basename(decodeURIComponent(req.url.slice(6)));
    const archivo = path.join(DESTINO, nombre);
    if (archivo.startsWith(DESTINO) && fs.existsSync(archivo)) {
      res.writeHead(200, { 'Content-Type': 'image/webp' });
      fs.createReadStream(archivo).pipe(res);
      return;
    }
    res.writeHead(404).end('no está');
    return;
  }
  if (req.method === 'POST' && req.url === '/guardar') {
    let cuerpo = '';
    req.on('data', (c) => {
      cuerpo += c;
    });
    req.on('end', async () => {
      let resultado;
      try {
        resultado = await guardar(JSON.parse(cuerpo).asignaciones || []);
      } catch (err) {
        resultado = { ok: false, informe: `Falló: ${err.message}` };
      }
      console.log(`\n${resultado.informe}\n`);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(resultado));
    });
    return;
  }
  res.writeHead(404).end('no está');
});

servidor.listen(PUERTO, () => {
  const direccion = `http://localhost:${PUERTO}`;
  console.log('─'.repeat(60));
  console.log('  Abriendo el navegador...\n');
  console.log(`  Si no se abre solo, entra a:  ${direccion}\n`);
  console.log('  Ahí eliges a qué producto va cada foto y pulsas Guardar.');
  console.log('  Cuando termines, cierra esta ventana negra.');
  console.log('─'.repeat(60));

  // Se abre el navegador solo: el dueño no tiene por qué copiar direcciones a
  // mano. Si el sistema no lo permite, arriba queda escrita la dirección.
  const abrir = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  execFile(process.platform === 'win32' ? 'cmd' : 'sh', process.platform === 'win32' ? ['/c', `${abrir} ${direccion}`] : ['-c', `${abrir} ${direccion}`], () => {});
});
