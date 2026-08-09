// Datos de las cabeceras, para recrear el catálogo.
//
// Se perdieron los productos de la base de datos y el dueño los dictó de nuevo.
// Este archivo es la fuente; `node scripts/crear-productos.mjs TU_CLAVE` los
// sube todos de una vez.
//
// Las descripciones llegaron sin tildes (se dictaron rápido) y aquí van
// corregidas: son el texto que lee el cliente y lo que indexa Google.
//
// Todas las cabeceras comparten medidas y precios; lo propio de cada una es el
// nombre, la descripción y la foto.

// Medidas reales (ancho x fondo x alto), con la medida interior —la que tiene
// que calzar con la cama— y la falda que va bajo el colchón. Las que había
// guardadas estaban mal: les faltaba el fondo, el interior y la falda, que es
// justo lo que el cliente necesita para saber si le entra.
export const TAMANOS = [
  { id: '1.5plaza', label: '1 Plaza y Media', dims: '120 x 13.5 x 150 cm · Interior 108 cm · Falda 70 cm', precio: 220 },
  { id: '2plazas', label: '2 Plazas', dims: '150 x 13.5 x 150 cm · Interior 138 cm · Falda 70 cm', precio: 230 },
  { id: 'queen', label: 'Queen', dims: '165 x 13.5 x 150 cm · Interior 158 cm · Falda 70 cm', precio: 310 },
  { id: 'king', label: 'King', dims: '215 x 13.5 x 150 cm · Interior 205 cm · Falda 70 cm', precio: 410 },
];

// Precio por tamaño, igual para todas las cabeceras.
export const PRECIOS = Object.fromEntries(TAMANOS.map((t) => [t.id, t.precio]));

// id: el que va en la dirección (eydperu.vercel.app/producto/milan)
// foto: ruta dentro de public/, o null si todavía no está subida
export const CABECERAS = [
  {
    id: 'milan',
    name: 'MILÁN',
    descripcion:
      'Un diseño atemporal de líneas depuradas y elegantes que aporta un toque de distinción a tu dormitorio. Su estructura acolchada brinda un confort superior, convirtiéndolo en la pieza central perfecta para ambientes modernos o clásicos.',
    foto: null,
  },
  {
    id: 'viena',
    name: 'VIENA',
    descripcion:
      'Presenta un patronaje pulcro y envolvente que añade textura y profundidad a la pared principal, aportando esa sensación de serenidad que tu dormitorio necesita.',
    foto: null,
  },
  {
    id: 'monarca',
    name: 'MONARCA',
    descripcion:
      'Su icónico diseño de silueta arqueada superior, combinado con un delicado acabado en capitoné tradicional, otorga una presencia majestuosa y atemporal que atraviesa modas.',
    foto: null,
  },
  {
    id: 'prisma',
    name: 'PRISMA',
    descripcion:
      'Una propuesta de vanguardia con retícula geométrica de bloques acolchados abullonados. Su relieve tridimensional y su volumen destacan por ofrecer una estética contemporánea, dinámica y llena de carácter.',
    foto: null,
  },
  {
    id: 'atenas',
    name: 'ATENAS',
    descripcion:
      'Inspirado en las formas orgánicas y majestuosas de las conchas marinas y los abanicos clásicos. Sus gajos trazados en abanico abren el espacio visualmente, convirtiendo la cama en una obra de arte Art Déco.',
    foto: null,
  },
  {
    id: 'matriz',
    name: 'MATRIZ',
    descripcion:
      'Estructura de bloques rectangulares entrelazados que juegan con las luces y las sombras. Ideal para dormitorios de estilo urbano y minimalista que buscan orden visual con un toque de textura mullida.',
    foto: null,
  },
  {
    id: 'escama',
    name: 'ESCAMA',
    descripcion:
      'Un diseño dinámico y vanguardista con módulos superpuestos de bordes curvos. Inspirado en formas orgánicas, aporta movimiento, profundidad y un impacto visual único a la recámara.',
    foto: null,
  },
  {
    id: 'venecia',
    name: 'VENECIA',
    descripcion:
      'Textura acanalada de varillas verticales acolchadas que acentúan la altura del ambiente. Su estilo estriado transmite modernidad, fluidez y una elegancia minimalista impecable.',
    foto: null,
  },
  {
    id: 'cascada',
    name: 'CASCADA',
    descripcion:
      'Trazos de franjas continuas que evocan la fluidez de una caída de agua. Diseñado para aportar amplitud horizontal y una sensación de relajación y confort envolvente.',
    foto: null,
  },
  {
    id: 'pentagonal',
    name: 'PENTAGONAL',
    descripcion:
      'Geometría arquitectónica en su máxima expresión. Sus paneles en formato pentagonal crean una composición tridimensional audaz, perfecta para proyectos de interiorismo de alto impacto.',
    foto: null,
  },
  {
    id: 'line-button',
    name: 'LINE BUTTON',
    descripcion:
      'La fusión perfecta entre el minimalismo de las líneas rectas y el toque acogedor de los botones capitoneados. Aporta textura sin recargar el ambiente, ideal para estilos versátiles y contemporáneos.',
    foto: null,
  },
  {
    id: 'vertice',
    name: 'VÉRTICE',
    descripcion:
      'Patrón geométrico en V que dirige la mirada hacia el centro. Un diseño dinámico que aporta carácter, modernidad y una sensación visual de mayor altura.',
    foto: null,
  },
  {
    id: 'brick-grid',
    name: 'BRICK GRID',
    descripcion:
      'Inspirado en la mampostería urbana, este patrón tipo ladrillo acolchado brinda un look industrial chic y estructurado, aportando volumen y textura a espacios vanguardistas.',
    foto: null,
  },
  {
    id: 'aura',
    name: 'AURA',
    descripcion:
      'Silueta envolvente que enmarca la cama con trazos concéntricos suaves. Diseñado para crear una atmósfera cálida, pacífica y de máximo confort en el dormitorio.',
    foto: null,
  },
  {
    id: 'lotus',
    name: 'LOTUS',
    descripcion:
      'Paneles mullidos y redondeados inspirados en los pétalos de la flor de loto. Transmite suavidad, armonía y un descanso acogedor con una estética orgánica muy elegante.',
    foto: null,
  },
  {
    id: 'helios',
    name: 'HELIOS',
    descripcion:
      'Traza radiante que simula los rayos del sol expandiéndose desde el centro. Una pieza protagónica que llena de luz, amplitud y energía el espacio principal.',
    foto: null,
  },
  {
    id: 'zafiro',
    name: 'ZAFIRO',
    descripcion:
      'Sus cortes angulares recuerdan las facetas de una joya, ofreciendo un volumen firme y una presencia sofisticada.',
    foto: null,
  },
  {
    id: 'ambar',
    name: 'ÁMBAR',
    descripcion:
      'Su acolchado continuo y su relieve suave invitan al descanso, agregando una textura rica a la decoración.',
    foto: null,
  },
  {
    id: 'cuarzo',
    name: 'CUARZO',
    descripcion:
      'Paneles tridimensionales de textura firme y mullida. Aporta un toque de modernidad equilibrada, ideal para ambientes relajantes con estilo de hotelería de lujo.',
    foto: null,
  },
  {
    id: 'opalo',
    name: 'ÓPALO',
    descripcion:
      'Un diseño que juega con los relieves y la luz en el tapizado. Su patrón armónico proyecta delicadeza, modernidad y una sutil sensación de amplitud.',
    foto: null,
  },
  {
    id: 'gemma',
    name: 'GEMMA',
    descripcion:
      'Patrón geométrico de rombos y diamantes en alto relieve. Añade textura, dinamismo y un aspecto mullido sofisticado que resalta en cualquier textil.',
    foto: null,
  },
  {
    id: 'aureo',
    name: 'ÁUREO',
    descripcion:
      'Diseño de proporciones perfectas que incorpora sutiles acentos visuales y líneas estilizadas. Representa el lujo discreto y la armonía visual en el dormitorio.',
    foto: null,
  },
  {
    id: 'honeycomb',
    name: 'HONEYCOMB',
    descripcion:
      'Trama tridimensional inspirada en la estructura en panal. Un diseño moderno y de gran textura que aporta un toque creativo y vanguardista.',
    foto: null,
  },
  {
    id: 'fusion',
    name: 'FUSION',
    descripcion:
      'Mosaico contemporáneo que combina bloques de distintas dimensiones. Aporta carácter único y una textura rica que rompe con la monotonía del dormitorio.',
    foto: null,
  },
  {
    id: 'wave',
    name: 'WAVE',
    descripcion:
      'Diseño con franjas verticales acolchadas y un remate superior en forma de ondas suaves. Cuenta con orejas laterales que enmarcan la cama, aportando un estilo delicado, acogedor y elegante.',
    foto: null,
  },
  {
    id: 'nexus',
    name: 'NEXUS',
    descripcion:
      'Entramado de líneas entrelazadas con volumen prominente. Conecta el diseño arquitectónico con el confort, creando una pared focal de alto impacto.',
    foto: null,
  },
  {
    id: 'tangram',
    name: 'TANGRAM',
    descripcion:
      'Composición asimétrica estilo rompecabezas. Pensado para espacios modernos, artísticos y atrevidos que buscan una pieza de diseño exclusivo.',
    foto: null,
  },
  {
    id: 'canopy',
    name: 'CANOPY',
    descripcion:
      'Patrón geométrico acolchado con cortes angulares en diamantes y marco firme a los lados. Ideal para un dormitorio moderno con un estilo fuerte y elegante.',
    foto: null,
  },
  {
    id: 'imperial',
    name: 'IMPERIAL',
    descripcion:
      'Diseño moderno y llamativo con grandes paneles acolchados en curvas fluidas y anchas. Sus líneas y marcos laterales firmes le dan una presencia imponente y un estilo vanguardista.',
    foto: null,
  },
  {
    id: 'altair',
    name: 'ALTAIR',
    descripcion:
      'Diseño asimétrico y moderno. Mezcla cortes geométricos angulares en una esquina con franjas horizontales acolchadas en el resto del cabecero.',
    foto: null,
  },
  {
    id: 'moka',
    name: 'MOKA',
    descripcion:
      'Un diseño que trae la calidez del momento perfecto. Textura mullida que invita al descanso con estilo refinado.',
    foto: null,
  },
  {
    id: 'hexa',
    name: 'HEXA',
    descripcion:
      'Trama hexagonal continua en relieve. Ofrece una estética moderna, limpia y geométrica, perfecta para ambientes jóvenes y sofisticados.',
    foto: null,
  },
  {
    id: 'titanium',
    name: 'TITANIUM',
    descripcion:
      'Diseño de corte arquitectónico con marco perimetral reforzado en relieve. Proyecta firmeza, solidez y una elegancia industrial-contemporánea.',
    foto: null,
  },
  {
    id: 'cristal',
    name: 'CRISTAL',
    descripcion:
      'Inspirado en las facetas de un cristal. Presenta paneles acolchados en ángulos que crean un diseño asimétrico, moderno y con mucho estilo.',
    foto: null,
  },
];
