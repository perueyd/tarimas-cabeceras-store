// ---------- CARTAS DE TELA ----------
// Paletas listas para cargar de golpe desde el panel → Colores.
//
// ⚠️ Los códigos de color son una APROXIMACIÓN tomada de la foto de la carta.
// La luz de la foto y la pantalla alteran el tono, así que después de cargarlos
// conviene ajustar los que se vean distintos usando el selector de color del
// panel (el cuadrito de color al lado de cada uno).
//
// Los ids llevan prefijo (velvet- / lisa-) para que se puedan cargar las dos
// cartas sin que se pisen entre ellas.

export const PALETAS = [
  {
    id: 'velvet-18',
    nombre: 'Velvet — 18 colores',
    colores: [
      { id: 'velvet-crema', label: 'Crema', hex: '#f2ebdd' },
      { id: 'velvet-marfil', label: 'Marfil', hex: '#e9e2d3' },
      { id: 'velvet-gris-perla', label: 'Gris perla', hex: '#c7c7c5' },
      { id: 'velvet-topo', label: 'Topo', hex: '#8c7c6a' },
      { id: 'velvet-chocolate', label: 'Chocolate', hex: '#6a5745' },
      { id: 'velvet-verde-militar', label: 'Verde militar', hex: '#4b4b44' },
      { id: 'velvet-azul-noche', label: 'Azul noche', hex: '#262e36' },
      { id: 'velvet-celeste-humo', label: 'Celeste humo', hex: '#aab7bf' },
      { id: 'velvet-gris-acero', label: 'Gris acero', hex: '#7c8389' },
      { id: 'velvet-gris-petroleo', label: 'Gris petróleo', hex: '#4e5b5f' },
      { id: 'velvet-blanco', label: 'Blanco', hex: '#eef2f5' },
      { id: 'velvet-azul-rey', label: 'Azul rey', hex: '#1b57b2' },
      { id: 'velvet-azul-petroleo', label: 'Azul petróleo', hex: '#1f6070' },
      { id: 'velvet-azul-marino', label: 'Azul marino', hex: '#1f3b7c' },
      { id: 'velvet-rosa-cuarzo', label: 'Rosa cuarzo', hex: '#f0a9ce' },
      { id: 'velvet-fucsia', label: 'Fucsia', hex: '#d7328f' },
      { id: 'velvet-rojo-carmin', label: 'Rojo carmín', hex: '#c9112f' },
      { id: 'velvet-vino', label: 'Vino', hex: '#8f2046' },
    ],
  },
  {
    id: 'lisa-16',
    nombre: 'Tela lisa — 16 colores',
    colores: [
      { id: 'lisa-blanco', label: 'Blanco puro', hex: '#f6f3ef' },
      { id: 'lisa-hueso', label: 'Hueso', hex: '#ece3d8' },
      { id: 'lisa-arena', label: 'Arena', hex: '#d8cbbb' },
      { id: 'lisa-greige', label: 'Greige', hex: '#b3a698' },
      { id: 'lisa-gris-calido', label: 'Gris cálido', hex: '#9a9187' },
      { id: 'lisa-rosa-chicle', label: 'Rosa chicle', hex: '#ec3b8e' },
      { id: 'lisa-magenta', label: 'Magenta', hex: '#c0389b' },
      { id: 'lisa-violeta', label: 'Violeta', hex: '#8e4a9e' },
      { id: 'lisa-rojo-cereza', label: 'Rojo cereza', hex: '#d81f45' },
      { id: 'lisa-turquesa', label: 'Turquesa', hex: '#22a7c4' },
      { id: 'lisa-azul-electrico', label: 'Azul eléctrico', hex: '#1657a8' },
      { id: 'lisa-blanco-humo', label: 'Blanco humo', hex: '#e4e6e8' },
      { id: 'lisa-gris-claro', label: 'Gris claro', hex: '#bdbfc1' },
      { id: 'lisa-gris-medio', label: 'Gris medio', hex: '#8e9092' },
      { id: 'lisa-grafito', label: 'Grafito', hex: '#5b5d5f' },
      { id: 'lisa-negro', label: 'Negro', hex: '#2a2c2e' },
    ],
  },
];
