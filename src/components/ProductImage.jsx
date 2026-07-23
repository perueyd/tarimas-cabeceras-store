// Muestra la imagen de un producto.
//
// tintable=true  -> repinta el mueble con el color elegido, al instante y sin
//                   necesitar una foto por cada color.
//
//                   NO hace falta subir la foto en tonos grises: la web la
//                   desatura sola. Cómo funciona:
//                     1. La foto se pasa a grises y se ACLARA, para que sus
//                        zonas iluminadas queden cerca del blanco.
//                     2. Encima se multiplica el color elegido, recortado a la
//                        silueta del mueble (con la transparencia de la foto).
//
//                   Al multiplicar sobre una base casi blanca, las zonas
//                   iluminadas dan EXACTAMENTE el color elegido y los pliegues
//                   quedan más oscuros — se conserva la textura (velvet,
//                   capitoné, costuras) y el color es fiel al que se eligió.
//
//                   Por qué NO se usa "luminosity": ese modo toma solo el tono
//                   del color y conserva la claridad de la foto, así que con una
//                   foto clara un vino salía rosado y un negro salía gris. Con
//                   multiply el color elegido es el TECHO: un color oscuro se ve
//                   oscuro. Si la foto es muy oscura, el peor caso es que salga
//                   más apagado — nunca un color equivocado.
//
//                   Si subes una foto SIN FONDO (PNG transparente) el color solo
//                   pinta el mueble. Con un JPG (sin transparencia) se tiñe todo
//                   el rectángulo, incluido el fondo.
//
// tintable=false -> muestra la foto tal cual (para fotos reales ya con su acabado).

// Cuánto se aclara la foto antes de multiplicar el color.
// 1.15 es el punto donde las zonas más iluminadas dan EXACTAMENTE el color
// elegido conservando casi todo el rango de sombras. Subirlo aplana los
// pliegues (más zonas quedan de un color plano); bajarlo hace que nunca se
// llegue al color elegido y todo salga más oscuro.
const BRILLO_BASE = 1.15;

export default function ProductImage({ baseImage, colorHex, alt, className = '', tintable = true }) {
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
        style={{ filter: `grayscale(1) brightness(${BRILLO_BASE})` }}
      />
      <div
        className="absolute inset-0 mix-blend-multiply transition-colors duration-150"
        style={{ backgroundColor: colorHex, ...maskStyle }}
      />
    </div>
  );
}
