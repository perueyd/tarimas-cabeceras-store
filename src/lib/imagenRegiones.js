// Detecta si la foto de un mueble tiene UNA o DOS telas distintas, y genera
// una máscara por cada una para poder repintarlas por separado.
//
// La idea: dos telas distintas se ven como dos grupos separados de brillo (ej.
// una cabecera con cuerpo oscuro y panel claro da un grupo en 0.19 y otro en
// 0.89). Si los dos grupos están bien separados, se corta la foto en dos zonas
// por ese punto; si el brillo es continuo (una sola tela con sus pliegues), se
// deja como una sola zona.
//
// Todo se calcula en el navegador al cargar la foto, sin que el dueño configure
// nada — solo necesita que la foto sea PNG recortado.

const TAM_ANALISIS = 96; // suficiente para decidir; rápido de procesar
const TAM_MASCARA = 512; // resolución de las máscaras que se pintan
const BRILLO_MAX = 3;
const BRILLO_BASE = 1.15;

// Umbral de Otsu: busca el corte que mejor separa la foto en dos grupos de
// brillo. Devuelve también qué tan bien separados quedaron (0 a 1).
function otsu(histograma, total) {
  let suma = 0;
  for (let i = 0; i < 256; i++) suma += i * histograma[i];

  let sumaFondo = 0;
  let pesoFondo = 0;
  let mejorVar = -1;
  let mejorCorte = 128;
  for (let t = 0; t < 256; t++) {
    pesoFondo += histograma[t];
    if (pesoFondo === 0) continue;
    const pesoFrente = total - pesoFondo;
    if (pesoFrente === 0) break;
    sumaFondo += t * histograma[t];
    const mediaFondo = sumaFondo / pesoFondo;
    const mediaFrente = (suma - sumaFondo) / pesoFrente;
    const varEntre = pesoFondo * pesoFrente * (mediaFondo - mediaFrente) ** 2;
    if (varEntre > mejorVar) {
      mejorVar = varEntre;
      mejorCorte = t;
    }
  }

  // Varianza total, para saber qué proporción explica el corte. Si el corte
  // explica casi toda la variación, es que de verdad hay dos grupos.
  const media = suma / total;
  let varTotal = 0;
  for (let i = 0; i < 256; i++) varTotal += histograma[i] * (i - media) ** 2;
  const separacion = varTotal > 0 ? mejorVar / total / varTotal : 0;

  return { corte: mejorCorte, separacion };
}

// Brillo con el que hay que aclarar una zona para que su parte más iluminada
// llegue a blanco (misma lógica que se usaba para la foto completa).
function brilloDe(luces) {
  if (luces.length < 20) return BRILLO_BASE;
  luces.sort((a, b) => a - b);
  const p75 = luces[Math.floor(luces.length * 0.75)];
  const p95 = luces[Math.floor(luces.length * 0.95)];
  const referencia = Math.min(p95, p75 * 1.35);
  if (!(referencia > 0.05)) return BRILLO_MAX;
  return Math.min(Math.max(1 / referencia, 1), BRILLO_MAX);
}

function lum(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Crea una máscara PNG donde solo son opacos los píxeles de la zona pedida.
function crearMascara(img, corte, quedarseConLosClaros) {
  const cv = document.createElement('canvas');
  cv.width = TAM_MASCARA;
  cv.height = TAM_MASCARA;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, TAM_MASCARA, TAM_MASCARA);
  const imagen = ctx.getImageData(0, 0, TAM_MASCARA, TAM_MASCARA);
  const d = imagen.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue; // ya es transparente (fondo recortado)
    const esClaro = lum(d[i], d[i + 1], d[i + 2]) * 255 > corte;
    if (esClaro !== quedarseConLosClaros) d[i + 3] = 0;
  }
  ctx.putImageData(imagen, 0, 0);
  return cv.toDataURL('image/png');
}

// Analiza la foto y devuelve las zonas a repintar.
// Cada zona: { mascara, brillo }. La primera es siempre la principal.
export function analizarImagen(img) {
  const cv = document.createElement('canvas');
  cv.width = TAM_ANALISIS;
  cv.height = TAM_ANALISIS;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, TAM_ANALISIS, TAM_ANALISIS);
  const d = ctx.getImageData(0, 0, TAM_ANALISIS, TAM_ANALISIS).data;

  const histograma = new Array(256).fill(0);
  const todas = [];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const l = lum(d[i], d[i + 1], d[i + 2]);
    todas.push(l);
    histograma[Math.min(255, Math.round(l * 255))]++;
  }
  if (todas.length < 50) return { zonas: [{ mascara: null, brillo: BRILLO_BASE }], dosTelas: false };

  const { corte, separacion } = otsu(histograma, todas.length);

  // Reparto de píxeles a cada lado del corte.
  const oscuros = todas.filter((l) => l * 255 <= corte);
  const claros = todas.filter((l) => l * 255 > corte);
  const menor = Math.min(oscuros.length, claros.length) / todas.length;
  const distancia = claros.length && oscuros.length
    ? claros.reduce((a, b) => a + b, 0) / claros.length - oscuros.reduce((a, b) => a + b, 0) / oscuros.length
    : 0;

  // Son dos telas si: el corte explica casi toda la variación, ninguna zona es
  // una esquirla insignificante, y los dos tonos están de verdad lejos. Si no,
  // es una sola tela con sus sombras.
  const dosTelas = separacion > 0.75 && menor > 0.12 && distancia > 0.28;

  if (!dosTelas) {
    return { zonas: [{ mascara: null, brillo: brilloDe(todas) }], dosTelas: false };
  }

  return {
    dosTelas: true,
    zonas: [
      { mascara: crearMascara(img, corte, false), brillo: brilloDe(oscuros) },
      { mascara: crearMascara(img, corte, true), brillo: brilloDe(claros) },
    ],
  };
}

export { BRILLO_BASE };
