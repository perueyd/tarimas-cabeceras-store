export const sizes = [
  { id: '1.5plaza', label: '1 Plaza y Media', dims: '135 x 190 cm' },
  { id: '2plazas', label: '2 Plazas', dims: '150 x 200 cm' },
  { id: 'queen', label: 'Queen', dims: '160 x 200 cm' },
  { id: 'king', label: 'King', dims: '200 x 200 cm' },
];

export const colors = [
  { id: 'gris', label: 'Gris', hex: '#8b8d91' },
  { id: 'beige', label: 'Beige', hex: '#d9c9a8' },
  { id: 'negro', label: 'Negro', hex: '#2b2b2b' },
  { id: 'azul', label: 'Azul Petróleo', hex: '#3b5a70' },
  { id: 'vino', label: 'Vino', hex: '#6e2a35' },
];

export const products = [
  {
    id: 'tarima-clasica',
    category: 'tarimas',
    name: 'Tarima Clásica Tapizada',
    baseImage: '/images/tarima-base.svg',
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
];

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
