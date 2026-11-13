// Revisa la tienda DE VERDAD, como lo haría un cliente.
//
//   npm run revisar-tienda
//   npm run revisar-tienda -- http://localhost:5173    (para probar en local)
//
// Las pruebas de `npm test` miran el código. Esto mira la tienda publicada: si
// Redis se vació, si una foto devuelve 404, si los bots dejaron de responder
// porque Groq retiró el modelo. Nada de eso se nota compilando.
//
// Esta es la revisión que habría cazado la pérdida del catálogo el mismo día
// en vez de semanas después.

// La dirección sale del mismo sitio que usa la tienda: al mudarse de dominio
// (octubre 2026) este script siguió revisando el viejo sin que nadie lo notara.
import { SITIO_URL } from '../src/data/sitio.js';
import { planesVisibles, proyectosVisibles, textosDeServicios } from '../src/lib/servicios.js';

const BASE = (process.argv[2] || SITIO_URL).replace(/\/$/, '');
const TIEMPO_LIMITE = 20000;

const resultados = [];
let fallos = 0;
let avisos = 0;

function anotar(nivel, titulo, detalle) {
  resultados.push({ nivel, titulo, detalle });
  if (nivel === 'fallo') fallos++;
  if (nivel === 'aviso') avisos++;
}

async function pedir(ruta, opciones = {}) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), TIEMPO_LIMITE);
  try {
    const res = await fetch(BASE + ruta, { ...opciones, signal: control.signal });
    return res;
  } finally {
    clearTimeout(reloj);
  }
}

async function revisar(titulo, fn) {
  try {
    const aviso = await fn();
    if (aviso) anotar('aviso', titulo, aviso);
    else anotar('ok', titulo, '');
  } catch (err) {
    anotar('fallo', titulo, err.message);
  }
}

// ---------------------------------------------------------------------------

// El catálogo es el corazón: si esto falla, no hay tienda.
let catalogo = null;

await revisar('El catálogo responde', async () => {
  const res = await pedir('/api/catalog');
  if (!res.ok) throw new Error(`/api/catalog devolvió ${res.status}`);
  catalogo = await res.json();
  if (!Array.isArray(catalogo.products)) throw new Error('la respuesta no trae lista de productos');
});

await revisar('Hay productos de verdad (no los de ejemplo)', async () => {
  if (!catalogo) throw new Error('no se pudo leer el catálogo');
  const n = catalogo.products.length;
  if (n === 0) throw new Error('EL CATÁLOGO ESTÁ VACÍO. Entra al panel → Copias de seguridad y restaura.');

  // El catálogo de fábrica son 4 productos de ejemplo. Si aparecen esos, es que
  // Redis no respondió y la tienda está enseñando muestras a los clientes.
  const deEjemplo = ['tarima-clasica', 'tarima-premium', 'cabecera-recta', 'cabecera-capitone'];
  const sonTodosEjemplo = n <= 4 && catalogo.products.every((p) => deEjemplo.includes(p.id));
  if (sonTodosEjemplo) {
    throw new Error(
      'La tienda está mostrando los 4 PRODUCTOS DE EJEMPLO, no los tuyos. ' +
        'Suele significar que la base de datos no respondió.'
    );
  }
  if (n < 20) return `solo ${n} productos; antes había 45. Revísalo.`;
  return null;
});

await revisar('Todos los productos visibles tienen precio', async () => {
  if (!catalogo) throw new Error('no se pudo leer el catálogo');
  const sinPrecio = catalogo.products
    .filter((p) => !p.oculto)
    .filter((p) => !p.sizePricing || Object.values(p.sizePricing).every((v) => v == null))
    .map((p) => p.id);
  if (sinPrecio.length) throw new Error(`sin precio: ${sinPrecio.join(', ')}`);
});

// Las fotos de un producto pueden venir por tres caminos distintos: la de
// portada (baseImage), una por medida (sizeImages) o la galería.
//
// Una foto de galería puede ser una dirección suelta o una ficha con
// variantes: una foto por medida (`porTamano`) y otras según la opción elegida
// (`segunOpcion`, por ejemplo la cabecera aérea). Se sacan TODAS, porque el
// cliente ve una u otra según lo que elija. Cuando solo se esperaban
// direcciones sueltas, la primera ficha con variantes hacía fallar la revisión
// entera con un error de programa en vez de decir qué foto faltaba.
function fotosDeGaleria(item) {
  if (typeof item === 'string') return [item];
  if (!item || typeof item !== 'object') return [];
  const deUna = (x) => [x?.url, ...Object.values(x?.porTamano || {})];
  return [...deUna(item), ...(Array.isArray(item.segunOpcion) ? item.segunOpcion.flatMap(deUna) : [])];
}

function fotosDe(p) {
  return [p.baseImage, ...Object.values(p.sizeImages || {}), ...(p.gallery || []).flatMap(fotosDeGaleria)].filter(
    (url) => typeof url === 'string' && url
  );
}

// Las fotos de la página de servicios: la de cada plan, las de cada proyecto
// del portafolio y la de portada. Un portafolio con una foto rota es peor que
// no tener portafolio, así que se vigilan igual que las de los productos.
function fotosDeServicios(c) {
  return [
    ...planesVisibles(c.services).map((p) => p.foto),
    ...proyectosVisibles(c.projects).flatMap((p) => p.fotos),
    textosDeServicios(c.storeConfig).fotoPortada,
  ].filter(Boolean);
}

// Las fotos de las opciones (tipo de pata, de botón…): también se ven en la ficha.
function fotosDeOpciones(p) {
  return (p.opciones || []).flatMap((g) => (g.valores || []).map((v) => v.img)).filter(Boolean);
}

await revisar('Todos los productos visibles tienen foto', async () => {
  if (!catalogo) throw new Error('no se pudo leer el catálogo');
  const sinFoto = catalogo.products.filter((p) => !p.oculto && fotosDe(p).length === 0).map((p) => p.id);
  if (sinFoto.length) return `sin foto: ${sinFoto.join(', ')}`;
  return null;
});

// Que el catálogo diga que hay foto no significa que la foto exista. Se
// comprueban TODAS, también las de las opciones, pero solo con HEAD: se pide
// la cabecera y no la imagen, así que no gasta transferencia.
//
// POR QUÉ TODAS Y POR QUÉ SE MIRA EL TIPO: antes se probaban 5 y bastaba con
// que respondiera 200. Las tres fotos de patas de la Tarima Clásica no
// existían y la tienda devolvía la portada (200, pero HTML) en su lugar: la
// revisión decía "15 bien" mientras los clientes veían tres imágenes rotas.
await revisar('Todas las fotos existen y son imágenes', async () => {
  if (!catalogo) throw new Error('no se pudo leer el catálogo');
  const urls = [
    ...new Set([
      ...catalogo.products.filter((p) => !p.oculto).flatMap((p) => [...fotosDe(p), ...fotosDeOpciones(p)]),
      ...fotosDeServicios(catalogo),
    ]),
  ];

  const rotas = [];
  async function probar(url) {
    const absoluta = url.startsWith('http') ? url : BASE + url;
    try {
      const res = await fetch(absoluta, { method: 'HEAD' });
      const tipo = res.headers.get('content-type') || '';
      if (!res.ok) rotas.push(`${url} (${res.status})`);
      else if (!tipo.startsWith('image/')) rotas.push(`${url} (no es una imagen: la foto no existe)`);
    } catch {
      rotas.push(`${url} (no responde)`);
    }
  }
  // De 8 en 8: rápido sin abrir cientos de conexiones a la vez.
  for (let i = 0; i < urls.length; i += 8) await Promise.all(urls.slice(i, i + 8).map(probar));
  if (rotas.length) throw new Error(`${rotas.length} de ${urls.length} fotos rotas: ${rotas.slice(0, 8).join(', ')}${rotas.length > 8 ? '…' : ''}`);
});

await revisar('Los colores y las medidas siguen ahí', async () => {
  if (!catalogo) throw new Error('no se pudo leer el catálogo');
  if (!catalogo.colors?.length) throw new Error('no hay colores: los productos no se podrán personalizar');
  if (!catalogo.sizes?.length) throw new Error('no hay medidas: no se podrá elegir tamaño');
});

// ---------------------------------------------------------------------------
// Lo privado no puede salir por la puerta pública
// ---------------------------------------------------------------------------

await revisar('No se filtran los tokens de integraciones', async () => {
  if (!catalogo) throw new Error('no se pudo leer el catálogo');
  const cfg = catalogo.storeConfig || {};
  if ('integrations' in cfg) throw new Error('¡/api/catalog está devolviendo los tokens de integraciones!');
  if ('ownerEmail' in cfg) throw new Error('/api/catalog está devolviendo el correo del dueño');
});

await revisar('No se filtran los códigos de descuento', async () => {
  const res = await pedir('/api/ofertas');
  if (!res.ok) return `/api/ofertas devolvió ${res.status}`;
  const data = await res.json();
  const cupones = (data.ofertas || []).filter((o) => o.tipo === 'codigo' || o.code || o.codigo);
  if (cupones.length) {
    throw new Error(`¡se están publicando ${cupones.length} códigos de descuento a cualquiera!`);
  }
  return null;
});

await revisar('El panel sigue pidiendo clave', async () => {
  const res = await pedir('/api/respaldos');
  if (res.status !== 401 && res.status !== 429) {
    throw new Error(`/api/respaldos respondió ${res.status} SIN clave; debería ser 401`);
  }
});

// ---------------------------------------------------------------------------
// Las páginas que la ley peruana obliga a tener
// ---------------------------------------------------------------------------

const PAGINAS_LEGALES = [
  ['/libro-de-reclamaciones', 'Libro de Reclamaciones (Ley 29571)'],
  ['/politica-privacidad', 'Política de Privacidad (Ley 29733)'],
  ['/terminos-condiciones', 'Términos y Condiciones'],
];

for (const [ruta, nombre] of PAGINAS_LEGALES) {
  await revisar(nombre, async () => {
    const res = await pedir(ruta);
    if (!res.ok) throw new Error(`${ruta} devolvió ${res.status}`);
  });
}

await revisar('El RUC y la razón social están publicados', async () => {
  const res = await pedir('/');
  const html = await res.text();
  // La tienda es una página que se arma en el navegador, así que los datos no
  // están en el HTML inicial: se comprueban en la configuración del catálogo.
  const cfg = catalogo?.storeConfig || {};
  const ruc = cfg.ruc || cfg.RUC || '';
  const razon = cfg.razonSocial || cfg.razon_social || '';
  if (!ruc) throw new Error('falta el RUC en los datos de la tienda (obligatorio por Ley 29571)');
  if (!razon) throw new Error('falta la razón social en los datos de la tienda');
  if (!html.includes('<div id="root"')) return 'la página principal se ve rara, revísala a ojo';
  return null;
});

// ---------------------------------------------------------------------------
// Los dos asistentes
//
// Groq retira modelos cada cierto tiempo sin avisar. Cuando pasa, los bots
// dejan de responder y nadie se entera hasta que un cliente se queja.
// ---------------------------------------------------------------------------

await revisar('CHAT-ED responde a los clientes', async () => {
  const res = await pedir('/api/chatbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hola' }] }),
  });
  if (res.status === 429) return 'límite de peticiones alcanzado; vuelve a intentar en un rato';
  if (!res.ok) {
    const texto = (await res.text()).slice(0, 200);
    throw new Error(
      `/api/chatbot devolvió ${res.status}. ${texto}\n` +
        '    Si menciona el modelo, Groq lo retiró: cambia GROQ_MODEL en Vercel.'
    );
  }
  return null;
});

// ---------------------------------------------------------------------------
// Que la tienda se pueda encontrar
// ---------------------------------------------------------------------------

await revisar('El mapa del sitio responde (para Google)', async () => {
  const res = await pedir('/sitemap.xml');
  if (!res.ok) throw new Error(`/sitemap.xml devolvió ${res.status}`);
  const xml = await res.text();
  if (!xml.includes('<urlset')) throw new Error('el mapa del sitio no tiene forma de mapa del sitio');
});

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

const ICONO = { ok: '  OK  ', aviso: ' AVISO', fallo: ' FALLA' };

console.log(`\nRevisión de ${BASE}\n`);
for (const r of resultados) {
  console.log(`${ICONO[r.nivel]}  ${r.titulo}`);
  if (r.detalle) console.log(`          ${r.detalle}`);
}

const bien = resultados.length - fallos - avisos;
console.log(`\n${bien} bien · ${avisos} avisos · ${fallos} fallas\n`);

if (fallos) {
  console.log('Hay algo roto en la tienda publicada. Lo de arriba dice qué.\n');
  process.exit(1);
}
if (avisos) {
  console.log('Nada roto, pero hay cosas que conviene mirar.\n');
}
