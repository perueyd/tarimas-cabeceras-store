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
  // Datos del negocio para el Libro de Reclamaciones (identifican al
  // proveedor ante el consumidor). Edítalos en el panel → Datos de la tienda.
  razonSocial: '',
  ruc: '',
  direccionFiscal: '',
  // Métodos de pago visibles en el checkout — apaga el que no uses (ej. si
  // no tienes cuenta bancaria para transferencia, o no quieres exponer Yape).
  paymentMethods: { culqi: true, yapePlin: true, transferencia: true },
  whatsapp: '51951278010',
  // Número que recibe Yape/Plin directo (se muestra al cliente en el checkout).
  yape: '951 278 010',
  yapeTitular: 'E|D Espacios y Diseño',
  // Cuentas bancarias para transferencia. Agrega las tuyas:
  // { banco: 'BCP', titular: 'Nombre Apellido', cuenta: '191-xxxxxxx-x-xx', cci: '00219100xxxxxxxxxx' },
  banks: [],
  leadTime: '3 a 4 días hábiles',
  deliveryMinDays: 4,
  deliverySlots: [
    { id: 'manana', label: 'Mañana (9:00 a.m. – 1:00 p.m.)' },
    { id: 'tarde', label: 'Tarde (2:00 p.m. – 6:00 p.m.)' },
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
    privacidadTexto: `En {{proveedor}} valoramos y respetamos tu privacidad. Esta Política de Privacidad explica qué datos personales recopilamos, con qué finalidad y cuáles son tus derechos, conforme a la Ley N.° 29733 (Ley de Protección de Datos Personales del Perú) y su reglamento.

1. Responsable del tratamiento
Los datos personales que nos brindas son tratados por {{proveedor}}. Para cualquier consulta sobre tus datos, escríbenos por WhatsApp al {{whatsapp}}.

2. Datos que recopilamos
Recopilamos los datos que nos brindas al hacer un pedido o contactarnos: nombre, número de documento (cuando aplica), teléfono, correo electrónico, dirección de entrega y la ubicación que marques en el mapa. Los datos de tu tarjeta son procesados directamente por nuestra pasarela de pagos (Culqi); nosotros no los almacenamos.

3. Finalidad
Usamos tus datos para procesar y entregar tu pedido, contactarte sobre el estado de tu compra, emitir el comprobante, atender tus consultas y reclamos y —solo si te suscribes voluntariamente— enviarte ofertas y novedades.

4. Conservación
Conservamos tus datos mientras exista una relación comercial o mientras sean necesarios para las finalidades descritas, y luego durante los plazos que exija la ley (por ejemplo, tributarios o de protección al consumidor).

5. Con quién compartimos tus datos
No vendemos tus datos. Solo los compartimos con proveedores que hacen posible tu compra: la pasarela de pagos (Culqi) y las agencias de transporte o el personal de entrega, únicamente para completar tu pedido.

6. Tus derechos (Derechos ARCO)
Tienes derecho a acceder, rectificar, cancelar y oponerte al tratamiento de tus datos personales. Para ejercerlos, escríbenos por WhatsApp al {{whatsapp}} indicando tu solicitud y tu número de documento. Atenderemos tu pedido en los plazos que establece la ley.

7. Seguridad
Aplicamos medidas técnicas y organizativas razonables para proteger tus datos. Ninguna transmisión por internet es 100% segura, pero trabajamos para reducir los riesgos.

8. Cambios
Podemos actualizar esta política. La versión vigente es la publicada en esta página.`,
    terminosActivo: true,
    terminosTitulo: 'Términos y Condiciones',
    terminosTexto: `Estos Términos y Condiciones regulan la compra de productos en esta tienda. Al realizar un pedido, aceptas estas condiciones.

1. Identificación
Esta tienda es operada por {{proveedor}}. Puedes contactarnos por WhatsApp al {{whatsapp}}.

2. Productos
Nuestros muebles se fabrican a pedido según el tamaño y color que elijas. Las imágenes son referenciales; pueden existir ligeras variaciones de tono según tu pantalla.

3. Precios
Los precios están expresados en Soles (S/) e incluyen los impuestos de ley. El precio válido es el que ves al momento de completar tu compra.

4. Pagos
Aceptamos los medios de pago que se muestran en el checkout (tarjeta o Yape mediante Culqi, Yape/Plin directo o transferencia bancaria). El pedido se confirma cuando se verifica el pago.

5. Entrega
El tiempo de fabricación y entrega es referencial y se indica en cada producto y en el checkout. En Lima Metropolitana coordinamos la entrega según tu distrito; para provincia, el envío se cotiza aparte y corre por cuenta del cliente a través de la agencia que elija.

6. Cambios y devoluciones
Al tratarse de productos fabricados a medida, aplican condiciones especiales para cambios y devoluciones. Escríbenos apenas notes cualquier inconveniente con tu pedido y buscaremos una solución.

7. Garantía
Nuestros productos cuentan con la garantía indicada en sus especificaciones frente a defectos de fabricación, en condiciones normales de uso.

8. Libro de Reclamaciones
Contamos con un Libro de Reclamaciones virtual a tu disposición, conforme a la normativa de protección al consumidor.

9. Ley aplicable
Estos términos se rigen por las leyes de la República del Perú.`,
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
