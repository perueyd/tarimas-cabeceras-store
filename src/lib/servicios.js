// Servicios y portafolio: las reglas que comparten el navegador y el servidor.
//
// La tienda nació para vender muebles; desde noviembre de 2026 ofrece además
// servicios (diseño de interiores, tapicería, instalación…) con dos formas de
// contratar, a elección del dueño en cada plan:
//
//   · "cotizar": el cliente escribe por WhatsApp y el precio se conversa.
//   · "pagar":   precio fijo, se paga en la web como cualquier compra.
//
// Vive aquí, y no dentro de la página, porque el servidor necesita las MISMAS
// respuestas: qué planes se muestran, cuánto cuesta cada uno y con qué producto
// se cobra. Dos copias de esta lógica acabarían enseñando un precio y cobrando
// otro.

import { getEffectivePrice, round2 } from './pricing.js';

// Un plan de precio fijo se cobra a través de un producto oculto que el
// servidor crea y mantiene solo (ver sincronizarProductos). Así el pago pasa
// por el carrito y el cobro de siempre, y el precio lo sigue decidiendo el
// servidor: no hay un segundo camino de cobro que vigilar.
export const TAMANO_SERVICIO = 'servicio';
const CATEGORIA_SERVICIOS = 'servicios';
const PREFIJO_PRODUCTO = 'servicio-';
// Un tope alto pero finito: un cero de más al teclear no puede publicar un
// plan de un millón de soles.
const PRECIO_MAXIMO = 200000;

const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const parrafo = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);

// Identificador apto para una dirección web y para una clave: minúsculas,
// números y guiones. "Diseño de sala" -> "diseno-de-sala".
export function aIdentificador(valor) {
  return String(valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// Solo fotos del propio sitio ("/productos/sala.webp") o de un servidor
// seguro. Una dirección "http://" la bloquea el navegador en una página
// segura y dejaría un hueco roto a la vista del cliente.
export function fotoValida(valor) {
  const url = String(valor ?? '').trim().slice(0, 500);
  if (/^\/[^/]/.test(url) || /^https:\/\//i.test(url)) return url;
  return '';
}

// El precio de un plan, o null si lo escrito no sirve como precio.
export function precioDePlanValido(valor) {
  const n = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  if (!Number.isFinite(n) || n <= 0 || n > PRECIO_MAXIMO) return null;
  return round2(n);
}

// Deja un plan con la forma exacta que se guarda: devuelve { item } o, si
// falta algo, { error } con el texto para el dueño. Se usa en el servidor
// antes de guardar: el panel puede tener un fallo, y lo guardado es lo que ve
// el cliente.
export function limpiarPlan(crudo) {
  const id = aIdentificador(crudo?.id);
  const nombre = texto(crudo?.nombre, 80);
  if (!id) return { error: 'Falta el identificador del plan.' };
  if (!nombre) return { error: 'Escribe el nombre del plan.' };

  const modo = crudo?.modo === 'pagar' ? 'pagar' : 'cotizar';
  const precio = precioDePlanValido(crudo?.precio);
  if (modo === 'pagar' && precio == null) {
    return { error: 'Para cobrar el plan en la web escribe su precio en soles (mayor a 0).' };
  }

  const incluye = (Array.isArray(crudo?.incluye) ? crudo.incluye : String(crudo?.incluye ?? '').split('\n'))
    .map((linea) => texto(linea, 140))
    .filter(Boolean)
    .slice(0, 12);

  return {
    item: {
      id,
      area: texto(crudo?.area, 60),
      nombre,
      descripcion: parrafo(crudo?.descripcion, 600),
      incluye,
      foto: fotoValida(crudo?.foto),
      modo,
      // El precio solo se guarda cuando se cobra en la web. En un plan a
      // cotizar no hay un número que el servidor vaya a respetar, y guardarlo
      // invitaría a mostrarlo como si lo fuera.
      precio: modo === 'pagar' ? precio : null,
      // Texto libre para los planes a cotizar: "Desde S/ 350 por ambiente".
      precioTexto: modo === 'cotizar' ? texto(crudo?.precioTexto, 60) : '',
      activo: crudo?.activo !== false,
    },
  };
}

export function limpiarProyecto(crudo) {
  const id = aIdentificador(crudo?.id);
  const titulo = texto(crudo?.titulo, 80);
  if (!id) return { error: 'Falta el identificador del proyecto.' };
  if (!titulo) return { error: 'Escribe el título del proyecto.' };

  const fotos = (Array.isArray(crudo?.fotos) ? crudo.fotos : []).map(fotoValida).filter(Boolean).slice(0, 12);

  return {
    item: {
      id,
      titulo,
      area: texto(crudo?.area, 60),
      descripcion: parrafo(crudo?.descripcion, 800),
      lugar: texto(crudo?.lugar, 60),
      anio: String(crudo?.anio ?? '').replace(/\D/g, '').slice(0, 4),
      fotos,
      activo: crudo?.activo !== false,
    },
  };
}

export function planesVisibles(services) {
  return (Array.isArray(services) ? services : []).filter((p) => p && p.activo !== false && p.nombre);
}

// Un proyecto sin fotos no se enseña: un portafolio es lo que se ve, y una
// tarjeta con un recuadro gris hace parecer que el trabajo no existe.
export function proyectosVisibles(projects) {
  return (Array.isArray(projects) ? projects : []).filter(
    (p) => p && p.activo !== false && p.titulo && Array.isArray(p.fotos) && p.fotos.length > 0
  );
}

// ¿Hay algo que mostrar? De esto depende que exista el enlace "Servicios" en
// la cabecera, en la portada y en el mapa del sitio. Mientras el dueño no
// publique nada real, la sección no aparece por ningún lado.
export function hayServicios(catalog) {
  return planesVisibles(catalog?.services).length > 0 || proyectosVisibles(catalog?.projects).length > 0;
}

// Los planes agrupados por área, en el orden en que el dueño los dejó.
export function agruparPorArea(planes) {
  const grupos = [];
  for (const plan of planes) {
    const area = plan.area || '';
    let grupo = grupos.find((g) => g.area === area);
    if (!grupo) grupos.push((grupo = { area, planes: [] }));
    grupo.planes.push(plan);
  }
  return grupos;
}

export function idProductoDePlan(planId) {
  return PREFIJO_PRODUCTO + planId;
}

// El producto oculto con el que se cobra un plan de precio fijo, o null si el
// plan no se cobra en la web.
function productoDePlan(plan) {
  // Un plan despublicado tampoco se puede cobrar: si conservara su producto,
  // seguiría siendo comprable para quien guardó el enlace o lo dejó en el
  // carrito, a un precio que el dueño ya retiró.
  if (!plan || plan.modo !== 'pagar' || plan.activo === false) return null;
  const precio = precioDePlanValido(plan.precio);
  if (precio == null) return null;
  return {
    id: idProductoDePlan(plan.id),
    name: plan.area ? `${plan.nombre} — ${plan.area}` : plan.nombre,
    category: CATEGORIA_SERVICIOS,
    shortDescription: String(plan.descripcion || '').slice(0, 200),
    baseImage: plan.foto || '',
    tintable: false,
    availableColors: [],
    sizePricing: { [TAMANO_SERVICIO]: precio },
    // "oculto" es la marca que ya respetan la tienda, el mapa del sitio, el
    // catálogo para Google y el chat: con ella el plan no aparece entre los
    // muebles. Se muestra en /servicios, que es su sitio.
    oculto: true,
    esServicio: true,
  };
}

// Deja la lista de productos de acuerdo con los planes: crea el producto de
// cada plan de precio fijo, actualiza su precio y quita el de los planes que
// ya no se cobran en la web.
//
// REGLA QUE NO SE PUEDE ROMPER: esta función escribe sobre la lista de
// productos, que es lo más valioso que guarda la tienda (ya se perdió una
// vez). Por eso solo toca los productos marcados `esServicio`; todo lo demás
// sale exactamente igual y en el mismo orden.
export function sincronizarProductos(products, services) {
  const actuales = Array.isArray(products) ? products : [];
  const deseados = new Map();
  for (const plan of Array.isArray(services) ? services : []) {
    const producto = productoDePlan(plan);
    if (producto) deseados.set(producto.id, producto);
  }

  let cambio = false;
  const resultado = [];
  for (const p of actuales) {
    if (!p?.esServicio) {
      // Un mueble que ya usa ese identificador manda: no se le crea un doble.
      // El plan se mostrará "a cotizar" hasta que se le cambie el nombre.
      deseados.delete(p?.id);
      resultado.push(p);
      continue;
    }
    const nuevo = deseados.get(p.id);
    if (!nuevo) {
      cambio = true; // el plan se borró o dejó de cobrarse en la web
      continue;
    }
    deseados.delete(p.id);
    if (JSON.stringify(nuevo) !== JSON.stringify(p)) cambio = true;
    resultado.push(nuevo);
  }
  for (const nuevo of deseados.values()) {
    resultado.push(nuevo);
    cambio = true;
  }
  return { products: resultado, cambio };
}

// Lo que se le enseña y se le cobra al cliente por un plan de precio fijo.
//
// Sale del PRODUCTO, no del número escrito en el plan: es el producto lo que
// el servidor cobra, así que leerlo de ahí garantiza que la tarjeta del plan y
// el cobro digan lo mismo. Si el producto no existe (no se pudo crear), devuelve
// null y la página ofrece cotizar por WhatsApp en vez de un botón que fallaría.
export function cobroDePlan(plan, products) {
  if (!plan || plan.modo !== 'pagar') return null;
  const producto = (Array.isArray(products) ? products : []).find(
    (p) => p?.id === idProductoDePlan(plan.id) && p.esServicio
  );
  if (!producto) return null;
  const precio = getEffectivePrice(producto, TAMANO_SERVICIO);
  if (!precio || !(precio.final > 0)) return null;
  return { producto, precio: precio.final, original: precio.original };
}

// Enlace de WhatsApp con el mensaje ya escrito. Devuelve '' si la tienda no
// tiene número configurado (entonces el botón no se pinta).
export function enlaceWhatsApp(storeConfig, mensaje) {
  const numero = String(storeConfig?.contacto?.whatsapp || storeConfig?.whatsapp || '').replace(/\D/g, '');
  if (!numero) return '';
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

// Los textos de la página de servicios. Todos se editan desde el panel
// (Editar página → Servicios); estos son solo el punto de partida, y por eso
// no afirman nada del negocio: ni años de experiencia, ni plazos, ni
// garantías. Eso lo escribe el dueño, que es quien sabe si es verdad.
export const TEXTOS_SERVICIOS = {
  menu: 'Servicios',
  titulo: 'Servicios',
  descripcion: '',
  fotoPortada: '',
  planesTitulo: 'Planes',
  planesDescripcion: '',
  pasosTitulo: 'Cómo trabajamos',
  pasos: [],
  portafolioTitulo: 'Proyectos realizados',
  portafolioDescripcion: '',
  ctaTitulo: '¿Tienes un proyecto en mente?',
  ctaTexto: 'Cuéntanos qué necesitas y te respondemos por WhatsApp.',
  ctaBoton: 'Escribir por WhatsApp',
};

// Lo guardado manda sobre el punto de partida, campo por campo. Un texto que
// el dueño dejó vacío a propósito se respeta (esa parte no se pinta), salvo
// los que la página no puede perder: el nombre del menú y los títulos.
const NO_PUEDEN_QUEDAR_VACIOS = ['menu', 'titulo', 'planesTitulo', 'portafolioTitulo', 'ctaBoton'];

export function textosDeServicios(storeConfig) {
  const guardado = storeConfig?.servicios && typeof storeConfig.servicios === 'object' ? storeConfig.servicios : {};
  const textos = { ...TEXTOS_SERVICIOS, ...guardado };
  for (const campo of NO_PUEDEN_QUEDAR_VACIOS) {
    if (!String(textos[campo] || '').trim()) textos[campo] = TEXTOS_SERVICIOS[campo];
  }
  textos.pasos = (Array.isArray(textos.pasos) ? textos.pasos : []).filter((p) => p && (p.titulo || p.texto));
  textos.fotoPortada = fotoValida(textos.fotoPortada);
  return textos;
}

// ¿Esta línea del carrito es un plan de servicio? Solo decide textos (el
// carrito dice "Servicio" en vez de un tamaño y el pago habla de una visita en
// vez de una entrega); el precio no depende de esto.
export function esLineaDeServicio(item) {
  return item?.sizeId === TAMANO_SERVICIO && String(item?.productId || '').startsWith(PREFIJO_PRODUCTO);
}
