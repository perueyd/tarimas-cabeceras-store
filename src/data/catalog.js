import { PRIVACIDAD, TERMINOS } from './textosLegales.js';
// ============================================================
//  CATÁLOGO DE LA TIENDA — ESTE ES EL ÚNICO ARCHIVO QUE NECESITAS
//  EDITAR PARA AGREGAR CATEGORÍAS, PRODUCTOS, PRECIOS Y COLORES.
//  Lee la guía completa en GUIA-EDICION.md (raíz del proyecto).
// ============================================================

// ---------- DATOS DE LA TIENDA ----------
// whatsapp: tu número con código de país, sin espacios ni "+" (ej. '51987654321').
//           Si lo dejas vacío, el botón de WhatsApp no se muestra.
// leadTime: texto del tiempo de fabricación/entrega que ve el cliente.
// deliveryMinDays: días mínimos desde hoy para elegir fecha de entrega en el checkout.
export const storeConfig = {
  // ---------- BRANDING (Logo, nombre, identidad) ----------
  branding: {
    logo: 'E|D',
    nombre: 'ESPACIOS Y DISEÑO',
    subtitulo: 'PROYECTOS INMOBILIARIOS',
  },

  // ---------- CONTACTO (Centralizado) ----------
  contacto: {
    whatsapp: '51951278010',
    telefonoFormato: '951 278 010',
    email: '',
  },

  // ---------- Datos del negocio (Libro de Reclamaciones) ----------
  razonSocial: '',
  ruc: '',
  direccionFiscal: '',
  // Correo del dueño para recibir aviso de cada pedido nuevo
  ownerEmail: '',

  // ---------- MÉTODOS DE PAGO ----------
  paymentMethods: { culqi: true, yapePlin: true, transferencia: true },
  yape: '951 278 010',
  yapeTitular: 'E|D Espacios y Diseño',
  banks: [],

  // ---------- AVISO DE COLOR ----------
  avisoColor: 'El color de la foto es referencial. El tono real puede variar según tu pantalla, la iluminación y el lote de la tela.',

  // ---------- ENTREGA ----------
  leadTime: '3 a 4 días hábiles',
  deliveryMinDays: 4,
  deliverySlots: [
    { id: 'manana', label: 'Mañana (9:00 a.m. – 1:00 p.m.)' },
    { id: 'tarde', label: 'Tarde (2:00 p.m. – 6:00 p.m.)' },
  ],

  // ---------- CUOTAS ----------
  cuotasNumero: 0,
  cuotasTexto: 'sin intereses con tu tarjeta',

  // ---------- SEO ----------
  seo: {
    siteName: 'E|D Espacios y Diseño',
    siteDesc: 'Tarimas, cabeceras y muebles a medida. Diseña tu espacio con los colores que imaginas.',
    keywords: 'tarimas, cabeceras, muebles, diseño, Perú',
  },

  // ---------- FOOTER ----------
  footer: {
    copyright: '© 2026 E|D Espacios y Diseño — Proyectos Inmobiliarios. Todos los derechos reservados.',
    paymentText: 'Pagos procesados de forma segura con Culqi. Precios en Soles (S/).',
    links: [
      { label: 'Libro de Reclamaciones', url: '/libro-de-reclamaciones' },
    ],
  },
  // Preguntas frecuentes (editable desde el panel). Se muestran en la portada.
  // Deja la lista vacía para no mostrar la sección.
  faq: [
    { q: '¿Cuánto demora la entrega?', a: 'Fabricamos a pedido y entregamos en 3 a 4 días hábiles en Lima. A provincias, el tiempo depende de la agencia de envío.' },
    { q: '¿El color real es igual al de la foto?', a: 'Es muy parecido, pero el tono puede variar un poco según tu pantalla, la luz y el lote de la tela. Si tienes dudas, escríbenos y te enviamos una foto real de la tela.' },
    { q: '¿Puedo pedir una medida distinta?', a: 'Sí, trabajamos a medida. Escríbenos por WhatsApp con la medida que necesitas y te cotizamos.' },
    { q: '¿Cómo puedo pagar?', a: 'Aceptamos Yape/Plin, transferencia bancaria y tarjeta. Verás todas las opciones al finalizar tu compra.' },
  ],
  // Textos y vínculos de la página principal (editables desde el panel).
  landing: {
    eyebrow: 'Hecho en Perú · Envíos a todo el país',
    titulo1: 'Tu dormitorio,',
    titulo2: 'en el color que imaginas.',
    descripcion: 'Tarimas, cabeceras y muebles a medida. Toca un color y mira cómo cambia la escena — así de fácil será elegir el tuyo.',
    marqueeWord: 'Espacios',
    cta1Label: 'Explorar la tienda',
    cta1Url: '/tienda',
    cta2Label: 'Ver cabeceras',
    cta2Url: '/tienda?categoria=cabeceras',
    // Sección "Todo para tu hogar" (grilla de categorías).
    categoriasTitulo: 'Todo para tu hogar',
    categoriasDescripcion: 'Empezamos con tarimas y cabeceras. Muy pronto: melamina, salas, comedores y sofás cama.',
    // Sección de 3 pasos ("Comprar es simple").
    comoFunciona: {
      titulo: 'Comprar es simple',
      pasos: [
        { titulo: 'Elige y personaliza', texto: 'Selecciona el modelo, el tamaño y el color que combine con tu espacio.' },
        { titulo: 'Paga seguro', texto: 'Con tarjeta o Yape a través de Culqi, en soles y sin complicaciones.' },
        { titulo: 'Recíbelo en casa', texto: 'Coordinamos la entrega e instalación según tu distrito.' },
      ],
    },
    // Fila de confianza en el checkout (iconos + texto corto). Deja la lista
    // vacía para no mostrar nada.
    confianza: [
      { icono: '🚚', texto: 'Entrega a tu casa' },
      { icono: '🔒', texto: 'Compra 100% segura' },
      { icono: '💬', texto: 'Ayuda por WhatsApp' },
    ],
  },

  // ---------- REDES SOCIALES (pie de página) ----------
  // Solo se muestra el ícono de la red que tenga una URL. Deja vacío lo que no uses.
  social: {
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: '',
    x: '',
  },

  // ---------- NEWSLETTER (suscripción por correo) ----------
  newsletter: {
    activo: true,
    titulo: 'Recibe nuestras ofertas y novedades',
    descripcion: 'Suscríbete y entérate primero de descuentos y nuevos diseños.',
  },

  // ---------- ENCUESTA POST-COMPRA (opcional, en la página de gracias) ----------
  // El cliente decide si la responde o no. tipo: 'opciones' (una sola) o 'texto'.
  encuesta: {
    activa: true,
    titulo: '¿Nos ayudas con una encuesta rápida?',
    descripcion: 'Es opcional y nos ayuda muchísimo a mejorar. Toma 20 segundos.',
    preguntas: [
      {
        id: 'origen',
        label: '¿Cómo nos encontraste?',
        tipo: 'opciones',
        opciones: ['Google', 'Instagram / Facebook', 'TikTok', 'Recomendación de un amigo', 'Otro'],
      },
      { id: 'comentario', label: '¿Algo que podamos mejorar? (opcional)', tipo: 'texto' },
    ],
  },

  // ---------- PÁGINAS LEGALES ----------
  // Textos editables. {{proveedor}} y {{whatsapp}} se reemplazan solos con tus
  // datos (razón social, RUC, domicilio y número de WhatsApp). ⚠️ Son plantillas
  // orientativas: haz que un abogado en Perú las revise antes de confiar en ellas.
  legal: {
    privacidadActiva: true,
    privacidadTitulo: 'Política de Privacidad',
    privacidadTexto: PRIVACIDAD,
    terminosActivo: true,
    terminosTitulo: 'Términos y Condiciones',
    terminosTexto: TERMINOS,
  },
};

// ---------- CATEGORÍAS ----------
// active: true  -> se muestra en la tienda
// active: false -> aparece como "Próximamente" en la portada
export const categories = [
  { id: 'tarimas', label: 'Tarimas', active: true },
  { id: 'cabeceras', label: 'Cabeceras', active: true },
  { id: 'melamina', label: 'Muebles de Melamina', active: false },
  { id: 'salas', label: 'Salas y Comedores', active: false },
  { id: 'sofas-cama', label: 'Sofás Cama', active: false },
];

// ---------- TAMAÑOS ----------
// Editable desde el panel → Editar página → Tamaños.
// Un producto solo muestra los tamaños que tengan precio en su sizePricing.
// 'unico' sirve para muebles que no van por plazas (ej. un ropero de melamina).
export const sizes = [
  { id: '1.5plaza', label: '1 Plaza y Media', dims: '135 x 190 cm' },
  { id: '2plazas', label: '2 Plazas', dims: '150 x 200 cm' },
  { id: 'queen', label: 'Queen', dims: '160 x 200 cm' },
  { id: 'king', label: 'King', dims: '200 x 200 cm' },
  { id: 'unico', label: 'Tamaño único', dims: 'Ver especificaciones' },
];

// ---------- COLORES ----------
// hex = color con el que se tiñe la imagen base (foto en tonos grises).
export const colors = [
  { id: 'gris', label: 'Gris', hex: '#8b8d91' },
  { id: 'beige', label: 'Beige', hex: '#d9c9a8' },
  { id: 'negro', label: 'Negro', hex: '#2b2b2b' },
  { id: 'azul', label: 'Azul Petróleo', hex: '#3b5a70' },
  { id: 'vino', label: 'Vino', hex: '#6e2a35' },
  // Acabados típicos de melamina (agrega los que uses):
  { id: 'roble', label: 'Roble', hex: '#b08a5a' },
  { id: 'nogal', label: 'Nogal', hex: '#7a5638' },
  { id: 'blanco', label: 'Blanco', hex: '#f2f0ec' },
];

// ---------- VITRINA ANIMADA (portada) ----------
// Editable desde el panel → Editar página → Vitrina animada.
// Paneles del carrusel 3D "arrastra o toca un panel" de la portada.
//   id     texto único
//   label  nombre visible en el panel
//   img    ruta o URL de la imagen/silueta
//   color  color de fondo del blob (hex)
//   cat    id de `categories` al que lleva al tocar el panel (opcional)
export const showcase = [
  { id: 'tarimas', label: 'Tarimas', img: '/images/tarima-base.svg', color: '#3b5a70', cat: 'tarimas' },
  { id: 'cabeceras', label: 'Cabeceras', img: '/images/cabecera-base.svg', color: '#6e2a35', cat: 'cabeceras' },
  { id: 'sofas-cama', label: 'Sofás Cama', img: '/images/sofa-base.svg', color: '#7a5638', cat: 'sofas-cama' },
  { id: 'salas', label: 'Sala y Comedor', img: '/images/comedor-base.svg', color: '#8b8d91', cat: 'salas' },
  { id: 'melamina', label: 'Melamina', img: '/images/ropero-base.svg', color: '#b08a5a', cat: 'melamina' },
];

// ---------- PRODUCTOS ----------
// Campos de cada producto:
//   id              texto único, sin espacios (se usa en la URL)
//   category        debe coincidir con un id de `categories`
//   name            nombre visible
//   baseImage       ruta de la imagen dentro de public/ (ej. '/images/mi-foto.jpg')
//   tintable        true  -> la imagen se tiñe con el color elegido (foto gris)
//                   false -> la foto se muestra tal cual (foto ya con su color)
//   shortDescription  texto corto para la tarjeta
//   specs           pares "Etiqueta: valor" que se muestran como tabla
//   sizePricing     precio en soles por tamaño (solo los que apliquen)
//   availableColors ids de `colors` disponibles para este producto
export const products = [
  {
    id: 'tarima-clasica',
    category: 'tarimas',
    name: 'Tarima Clásica Tapizada',
    baseImage: '/images/tarima-base.svg',
    tintable: true,
    shortDescription: 'Tarima box tapizada en tela chenille, estructura reforzada de madera de pino.',
    specs: {
      Material: 'Madera de pino tratada + tapizado chenille',
      Altura: '30 cm',
      'Capacidad de peso': 'Hasta 300 kg',
      Garantía: '12 meses',
      Armado: 'Incluye instalación en Lima Metropolitana',
    },
    sizePricing: { '1.5plaza': 349, '2plazas': 399, queen: 449, king: 549 },
    availableColors: ['gris', 'beige', 'negro', 'azul', 'vino'],
  },
  {
    id: 'tarima-premium',
    category: 'tarimas',
    name: 'Tarima Premium con Baúl',
    baseImage: '/images/tarima-base.svg',
    tintable: true,
    shortDescription: 'Tarima con espacio de almacenaje tipo baúl, ideal para dormitorios pequeños.',
    specs: {
      Material: 'MDP enchapado + tapizado tela linera',
      Altura: '35 cm',
      'Capacidad de peso': 'Hasta 320 kg',
      Garantía: '18 meses',
      Almacenaje: 'Baúl con pistones hidráulicos',
    },
    sizePricing: { '1.5plaza': 499, '2plazas': 569, queen: 629, king: 749 },
    availableColors: ['gris', 'beige', 'negro'],
  },
  {
    id: 'cabecera-recta',
    category: 'cabeceras',
    name: 'Cabecera Recta Minimalista',
    baseImage: '/images/cabecera-base.svg',
    tintable: true,
    shortDescription: 'Cabecera de líneas rectas, tapizada y acolchada, fácil de instalar en la pared.',
    specs: {
      Material: 'Estructura de madera + espuma D18 + tapizado chenille',
      Altura: '110 cm',
      Instalación: 'Kit de anclaje a pared incluido',
      Garantía: '12 meses',
    },
    sizePricing: { '1.5plaza': 219, '2plazas': 249, queen: 279, king: 329 },
    availableColors: ['gris', 'beige', 'negro', 'azul', 'vino'],
  },
  {
    id: 'cabecera-capitone',
    category: 'cabeceras',
    name: 'Cabecera Capitoné',
    baseImage: '/images/cabecera-base.svg',
    tintable: true,
    shortDescription: 'Cabecera con acolchado capitoné en rombos, acabado premium para tu dormitorio.',
    specs: {
      Material: 'Estructura de madera + espuma alta densidad + tapizado velvet',
      Altura: '120 cm',
      Instalación: 'Kit de anclaje a pared incluido',
      Garantía: '18 meses',
    },
    sizePricing: { '1.5plaza': 279, '2plazas': 319, queen: 359, king: 419 },
    availableColors: ['gris', 'beige', 'negro', 'vino'],
  },

  // ============================================================
  // PLANTILLAS — copia, pega y edita cuando tengas fotos y precios.
  // Quita los /* */ para activarlas y cambia active:true en su categoría.
  // ============================================================
  /*
  {
    id: 'ropero-melamina-6-puertas',
    category: 'melamina',
    name: 'Ropero de Melamina 6 Puertas',
    baseImage: '/images/ropero-6-puertas.jpg',  // sube tu foto a public/images/
    tintable: false,                            // foto real con su acabado -> false
    shortDescription: 'Ropero amplio de melamina de 18 mm con 6 puertas y 2 cajones.',
    specs: {
      Material: 'Melamina 18 mm',
      Medidas: '180 x 55 x 200 cm (ancho x fondo x alto)',
      Garantía: '12 meses',
    },
    sizePricing: { unico: 899 },                // muebles sin plazas usan 'unico'
    availableColors: ['roble', 'nogal', 'blanco'],
  },
  {
    id: 'sofa-cama-basico',
    category: 'sofas-cama',
    name: 'Sofá Cama Reclinable',
    baseImage: '/images/sofa-cama-gris.jpg',    // foto en tono gris -> tintable true
    tintable: true,
    shortDescription: 'Sofá cama tapizado, se convierte en cama de 2 plazas.',
    specs: {
      Material: 'Estructura de metal + tapizado linera',
      'Como sofá': '180 x 90 cm',
      'Como cama': '180 x 110 cm',
      Garantía: '12 meses',
    },
    sizePricing: { unico: 749 },
    availableColors: ['gris', 'beige', 'azul', 'vino'],
  },
  */
];

// ---------- FUNCIONES AUXILIARES (no tocar) ----------
export function getProductById(id) {
  return products.find((p) => p.id === id);
}

export function getColorById(id) {
  return colors.find((c) => c.id === id);
}

export function getSizeById(id) {
  return sizes.find((s) => s.id === id);
}

export const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
});
