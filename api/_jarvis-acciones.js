// Las acciones que JARVIS puede EJECUTAR de verdad.
//
// Antes no tenía ninguna: cuando el dueño le decía "llévame al panel de
// productos", respondía "te estoy llevando..." y no pasaba nada. Se lo
// inventaba, que es peor que decir "no puedo".
//
// Ahora se le pasan estas herramientas al modelo (function calling). El modelo
// elige cuál usar y con qué datos; el navegador las ejecuta y le devuelve el
// resultado real. Si algo no está en esta lista, JARVIS no puede hacerlo — y
// las instrucciones le obligan a decirlo en vez de fingir.

// Pestañas del panel principal (/pedidos).
export const PESTANAS = {
  resumen: 'Resumen con las ventas y gráficas',
  pedidos: 'Lista de pedidos',
  resenas: 'Reseñas de clientes',
  carritos: 'Carritos abandonados',
  reclamos: 'Libro de reclamaciones',
  suscriptores: 'Correos suscritos al boletín',
  encuestas: 'Respuestas de la encuesta',
  ofertas: 'Ofertas y descuentos',
  promos: 'Códigos de descuento',
  descAuto: 'Descuentos automáticos',
  analytics: 'Analíticas',
  automaciones: 'Automatizaciones',
  ia: 'Recomendador con IA',
  gamificacion: 'Gamificación',
  omnichannel: 'Canales de venta',
  historial: 'Historial de códigos',
  editar: 'Editor de la página (productos, precios, textos, diseño)',
};

// Sub-pestañas dentro del editor (✏️ Editar página).
export const SUBPESTANAS = {
  branding: 'Marca: logo, nombre y colores',
  productos: 'Productos: crear, editar precios y fotos',
  categorias: 'Categorías de la tienda',
  colores: 'Colores de tela',
  tamanos: 'Tamaños disponibles',
  config: 'Datos de la tienda: WhatsApp, RUC, dirección',
  garantias: 'Tarjetas de confianza de la portada y opiniones',
  chatbot: 'Entrenar el chatbot de clientes',
  pagos: 'Formas de pago',
  entrega: 'Zonas y horarios de entrega',
  banners: 'Banners y avisos',
  design: 'Diseño y tipografía',
  blog: 'Blog',
  ai: 'IA y automatización',
  analytics: 'Analíticas avanzadas',
  integraciones: 'Integraciones externas',
  emailMarketing: 'Correos de marketing',
  security: 'Seguridad',
  seo: 'SEO y buscadores',
  portada: 'Textos de la página principal',
  vitrina: 'Vitrina animada',
  faq: 'Preguntas frecuentes',
  legal: 'Textos legales',
  encuesta: 'Encuesta a clientes',
};

export const HERRAMIENTAS = [
  {
    type: 'function',
    function: {
      name: 'abrir_seccion',
      description:
        'Abre una sección del panel de administración en la pantalla del dueño. Úsala cuando pida ir, llevarlo, abrir o mostrar una parte del panel.',
      parameters: {
        type: 'object',
        properties: {
          seccion: {
            type: 'string',
            enum: Object.keys(PESTANAS),
            description: 'Sección del panel a abrir.',
          },
          subseccion: {
            type: 'string',
            enum: Object.keys(SUBPESTANAS),
            description:
              'Solo si seccion es "editar". Parte concreta del editor, por ejemplo "productos" o "chatbot".',
          },
        },
        required: ['seccion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_ventas',
      description:
        'Devuelve las cifras REALES de ventas: total facturado, número de pedidos, pendientes de verificar y productos más vendidos. Úsala siempre que pregunte por ventas, ingresos o qué se vende más. Nunca inventes estos números.',
      parameters: {
        type: 'object',
        properties: {
          dias: {
            type: 'number',
            description: 'Cuántos días hacia atrás mirar. 30 por defecto.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_producto',
      description:
        'Busca productos del catálogo por nombre y devuelve sus precios y datos reales. Úsala antes de hablar de un producto concreto.',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Texto a buscar en el nombre del producto.' },
        },
        required: ['nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'buscar_pedido',
      description:
        'Busca un pedido por su código (formato ED-XXXXXXXXXX) o por el nombre o teléfono del cliente, y devuelve su estado real.',
      parameters: {
        type: 'object',
        properties: {
          busqueda: { type: 'string', description: 'Código, nombre o teléfono a buscar.' },
        },
        required: ['busqueda'],
      },
    },
  },
];

// Instrucciones que acompañan a las herramientas. Sin esto el modelo sigue
// diciendo "ya te llevé" aunque no haya llamado a ninguna función.
export const INSTRUCCIONES_ACCIONES = `

🛠️ PUEDES EJECUTAR ACCIONES DE VERDAD:
Tienes herramientas reales. Cuando el dueño te pida abrir una sección del panel, USA la herramienta abrir_seccion — no digas que lo estás haciendo sin llamarla.

CÓMO LO PIDE EL DUEÑO (usa el sentido común, no esperes el nombre exacto):
- "catálogo", "productos", "el catálogo", "mis productos", "precios" → seccion "editar", subseccion "productos"
- "ventas", "cuánto vendí", "resumen" → seccion "resumen"
- "pedidos", "las órdenes", "quién compró" → seccion "pedidos"
- "opiniones", "comentarios", "estrellas" → seccion "resenas"
- "cupones", "códigos", "descuentos" → seccion "promos"
- "ofertas", "promociones" → seccion "ofertas"
- "colores", "telas" → seccion "editar", subseccion "colores"
- "medidas", "tamaños" → seccion "editar", subseccion "tamanos"
- "el bot", "el chat", "entrenar" → seccion "editar", subseccion "chatbot"
- "la portada", "la página principal" → seccion "editar", subseccion "portada"
- "envíos", "entrega", "reparto" → seccion "editar", subseccion "entrega"
- "pagos", "Yape", "cobrar" → seccion "editar", subseccion "pagos"
Si dudas entre dos, elige la más probable y ábrela: siempre puede pedirte otra.

REGLA ABSOLUTA: nunca afirmes haber hecho algo que no hiciste con una herramienta. Si te piden algo para lo que no tienes herramienta (crear un producto, cambiar un precio, enviar un correo), dilo claramente: "Eso todavía no lo puedo hacer yo; te abro la sección y lo cambias tú en un momento", y abre la sección correspondiente.

Para cifras de ventas usa consultar_ventas, y para precios buscar_producto. NUNCA des un número de memoria: siempre sale de la herramienta.

Después de usar una herramienta, comenta el resultado en una o dos frases. No repitas los datos en bruto.`;
