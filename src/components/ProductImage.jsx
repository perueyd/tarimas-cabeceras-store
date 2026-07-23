import { useEffect, useState } from 'react';
import { analizarImagen, BRILLO_BASE } from '../lib/imagenRegiones.js';

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
//                   DOS TELAS: si la foto tiene dos telas distintas (ej. cuerpo
//                   oscuro + panel claro), se detectan solas y se repintan por
//                   separado con colorHex y colorHex2. Cada zona se aclara con
//                   su propio brillo, porque una tela oscura necesita mucho más
//                   que una clara. Ver src/lib/imagenRegiones.js.
//
//                   Si subes una foto SIN FONDO (PNG transparente) el color solo
//                   pinta el mueble. Con un JPG (sin transparencia) se tiñe todo
//                   el rectángulo, incluido el fondo.
//
// tintable=false -> muestra la foto tal cual (para fotos reales ya con su acabado).

// Se recuerda el análisis ya hecho de cada foto: la misma imagen aparece en la
// tarjeta, el detalle y el carrito, y analizarla es costoso.
const cacheAnalisis = new Map();

function useAnalisis(src, activo) {
  const [analisis, setAnalisis] = useState(() => cacheAnalisis.get(src) || null);

  useEffect(() => {
    if (!activo || !src) return undefined;
    if (cacheAnalisis.has(src)) {
      setAnalisis(cacheAnalisis.get(src));
      return undefined;
    }
    let cancelado = false;
    const img = new Image();
    // Necesario para poder leer los píxeles de fotos servidas desde el almacén
    // (Vercel Blob). Si el servidor no lo permite, se usa el valor de respaldo.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let resultado = { zonas: [{ mascara: null, brillo: BRILLO_BASE }], dosTelas: false };
      try {
        resultado = analizarImagen(img);
      } catch {
        // Lienzo bloqueado por seguridad (CORS): se usa el respaldo.
      }
      cacheAnalisis.set(src, resultado);
      if (!cancelado) setAnalisis(resultado);
    };
    img.onerror = () => {};
    img.src = src;
    return () => {
      cancelado = true;
    };
  }, [src, activo]);

  return analisis;
}

// Recorta una capa a la silueta indicada (la propia foto, o la máscara de una
// de las telas cuando hay dos).
function recorte(url) {
  return {
    WebkitMaskImage: `url(${url})`,
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskImage: `url(${url})`,
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
  };
}

export default function ProductImage({ baseImage, colorHex, colorHex2, onDosTelas, alt, className = '', tintable = true }) {
  const analisis = useAnalisis(baseImage, tintable);

  // Avisa a la página del producto si esta foto tiene dos telas, para que
  // muestre (o no) el segundo selector de color.
  const dosTelas = Boolean(analisis?.dosTelas);
  useEffect(() => {
    if (onDosTelas) onDosTelas(dosTelas);
  }, [dosTelas, onDosTelas]);

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

  const zonas = analisis?.zonas || [{ mascara: null, brillo: BRILLO_BASE }];
  // El segundo color solo aplica si de verdad se detectaron dos telas; si no,
  // la segunda zona no existe y todo se pinta del color principal.
  const colores = [colorHex, colorHex2 || colorHex];

  return (
    // "isolate" encierra la mezcla dentro de esta tarjeta: sin eso, el blend se
    // mezclaría también con el fondo de la página.
    <div className={`relative isolate overflow-hidden bg-neutral-100 ${className}`}>
      {zonas.map((zona, i) => (
        <div
          key={i}
          className="absolute inset-0 isolate"
          // Cada tela se recorta a su propia silueta. Con una sola tela no hay
          // máscara aquí: el recorte lo hace la capa de color, como siempre.
          style={zona.mascara ? recorte(zona.mascara) : undefined}
        >
          <img
            src={baseImage}
            alt={i === 0 ? alt : ''}
            aria-hidden={i > 0}
            className="absolute inset-0 h-full w-full object-contain"
            style={{ filter: `grayscale(1) brightness(${zona.brillo.toFixed(2)})` }}
          />
          <div
            className="absolute inset-0 mix-blend-multiply transition-colors duration-150"
            style={{
              backgroundColor: colores[i] || colorHex,
              // Sin máscara de zona, el color se recorta con la propia foto.
              ...(zona.mascara ? {} : recorte(baseImage)),
            }}
          />
        </div>
      ))}
    </div>
  );
}
