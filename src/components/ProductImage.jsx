import { useEffect, useState } from 'react';

// Muestra la imagen de un producto.
//
// tintable=true  -> repinta el mueble con el color elegido, al instante y sin
//                   necesitar una foto por cada color.
//
//                   NO hace falta subir la foto en tonos grises: la web la
//                   desatura sola. Cómo funciona:
//                     1. La foto se pasa a grises y se ACLARA hasta que sus
//                        zonas más iluminadas quedan casi blancas.
//                     2. Encima se multiplica el color elegido, recortado a la
//                        silueta del mueble (con la transparencia de la foto).
//
//                   Al multiplicar sobre una base casi blanca, las zonas
//                   iluminadas dan EXACTAMENTE el color elegido y los pliegues
//                   quedan más oscuros — se conserva la textura (velvet,
//                   capitoné, costuras) y el color es fiel al elegido.
//
//                   Por qué NO se usa "luminosity": ese modo toma solo el tono
//                   del color y conserva la claridad de la foto, así que con una
//                   foto clara un vino salía rosado y un negro salía gris. Con
//                   multiply el color elegido es el TECHO: un color oscuro se ve
//                   oscuro y el peor caso es que salga apagado, nunca un color
//                   equivocado.
//
//                   Cuánto hay que aclarar depende de CADA foto: una foto gris
//                   oscura necesita mucho más que una clara. Por eso el brillo
//                   se mide solo (ver medirBrillo) en vez de usar un valor fijo
//                   que solo le queda bien a un tipo de foto.
//
//                   Si subes una foto SIN FONDO (PNG transparente) el color solo
//                   pinta el mueble. Con un JPG (sin transparencia) se tiñe todo
//                   el rectángulo, incluido el fondo.
//
// tintable=false -> muestra la foto tal cual (para fotos reales ya con su acabado).

// Valor de respaldo cuando no se puede medir la foto (ej. el navegador no deja
// leer sus píxeles por seguridad). Sirve para una foto de producto normal.
const BRILLO_BASE = 1.15;
const BRILLO_MAX = 3;

// Se recuerda el brillo ya calculado por cada foto: la misma imagen aparece en
// la tarjeta, el detalle y el carrito, y no tiene sentido medirla cada vez.
const cacheBrillo = new Map();

// Mide qué tan iluminada está la foto y devuelve cuánto hay que aclararla para
// que sus zonas más claras lleguen a blanco. Se ignoran los píxeles
// transparentes (el fondo recortado) para medir solo el mueble.
function medirBrillo(img) {
  const N = 64; // basta una miniatura: es una medida, no un render
  const lienzo = document.createElement('canvas');
  lienzo.width = N;
  lienzo.height = N;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, N, N);
  const { data } = ctx.getImageData(0, 0, N, N);

  const luces = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // fondo transparente: no es el mueble
    luces.push((0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255);
  }
  if (luces.length < 20) return BRILLO_BASE; // muy poca info para confiar

  luces.sort((a, b) => a - b);
  const p75 = luces[Math.floor(luces.length * 0.75)];
  const p95 = luces[Math.floor(luces.length * 0.95)];

  // Se usa el percentil 95 como "zona más iluminada del mueble", pero acotado a
  // p75 * 1.35. Por qué: si la foto tiene una mancha clara que no es el mueble
  // (un trozo de fondo que quedó sin recortar, un reflejo fuerte), el p95 mide
  // ESA mancha y no el mueble, y el resultado es que no se aclara nada. Cuando
  // eso pasa hay un salto grande entre p75 y p95; el tope lo detecta y se queda
  // dentro del grueso de la foto. En una foto normal p95 y p75 están cerca, así
  // que el tope no se activa y la medición no cambia.
  const referencia = Math.min(p95, p75 * 1.35);
  if (!(referencia > 0.05)) return BRILLO_MAX; // foto casi negra: al máximo
  return Math.min(Math.max(1 / referencia, 1), BRILLO_MAX);
}

function useBrilloAuto(src, activo) {
  const [brillo, setBrillo] = useState(() => cacheBrillo.get(src) ?? BRILLO_BASE);

  useEffect(() => {
    if (!activo || !src) return undefined;
    if (cacheBrillo.has(src)) {
      setBrillo(cacheBrillo.get(src));
      return undefined;
    }
    let cancelado = false;
    const img = new Image();
    // Necesario para poder leer los píxeles de fotos servidas desde el almacén
    // (Vercel Blob). Si el servidor no lo permite, se usa el valor de respaldo.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let valor = BRILLO_BASE;
      try {
        valor = medirBrillo(img);
      } catch {
        // Lienzo bloqueado por seguridad (CORS): se queda con el respaldo.
      }
      cacheBrillo.set(src, valor);
      if (!cancelado) setBrillo(valor);
    };
    img.onerror = () => {};
    img.src = src;
    return () => {
      cancelado = true;
    };
  }, [src, activo]);

  return brillo;
}

export default function ProductImage({ baseImage, colorHex, alt, className = '', tintable = true }) {
  const brillo = useBrilloAuto(baseImage, tintable);

  // Sin foto todavía para esta combinación (ej. tamaño recién agregado, sin
  // subir su imagen aún) -> aviso en vez de un ícono de imagen rota.
  if (!baseImage) {
    return (
      <div className={`relative flex flex-col items-center justify-center gap-1 overflow-hidden bg-neutral-100 text-neutral-400 ${className}`}>
        <span className="text-3xl">🖼️</span>
        <span className="text-xs">Foto próximamente</span>
      </div>
    );
  }

  if (!tintable) {
    return (
      <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
        <img src={baseImage} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
      </div>
    );
  }

  // La silueta del mueble sale del canal de transparencia de la propia foto.
  const maskStyle = {
    WebkitMaskImage: `url(${baseImage})`,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskImage: `url(${baseImage})`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
  };

  return (
    // "isolate" encierra la mezcla dentro de esta tarjeta: sin eso, el blend se
    // mezclaría también con el fondo de la página.
    <div className={`relative isolate overflow-hidden bg-neutral-100 ${className}`}>
      <img
        src={baseImage}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ filter: `grayscale(1) brightness(${brillo.toFixed(2)})` }}
      />
      <div
        className="absolute inset-0 mix-blend-multiply transition-colors duration-150"
        style={{ backgroundColor: colorHex, ...maskStyle }}
      />
    </div>
  );
}
