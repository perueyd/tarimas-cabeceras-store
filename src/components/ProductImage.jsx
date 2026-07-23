// Muestra la imagen de un producto.
//
// tintable=true  -> repinta el mueble con el color elegido, al instante y sin
//                   necesitar una foto por cada color.
//
//                   NO hace falta subir la foto en tonos grises: la web la
//                   desatura sola. Cómo funciona:
//                     1. Se pinta el color elegido, recortado a la silueta del
//                        mueble (usando la transparencia de la propia foto).
//                     2. Encima va la foto desaturada con blend "luminosity",
//                        que aporta SOLO las luces y sombras — así se conserva
//                        la textura (pliegues del velvet, capitoné, costuras)
//                        pero el tono es el del color elegido.
//
//                   Se usa "luminosity" y no "multiply" porque multiply solo
//                   oscurece: teñía todo apagado y sucio (un magenta salía
//                   marrón oscuro). Con luminosity el color sale vivo, como
//                   cuando recoloreas una imagen en Canva.
//
//                   Si subes una foto SIN FONDO (PNG transparente) el color
//                   solo pinta el mueble. Con un JPG (sin transparencia) se
//                   tiñe todo el rectángulo, incluido el fondo.
//
// tintable=false -> muestra la foto tal cual (para fotos reales ya con su acabado).
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
    // "isolate" encierra la mezcla dentro de esta tarjeta: sin eso, el blend
    // se mezclaría también con el fondo de la página.
    <div className={`relative isolate overflow-hidden bg-neutral-100 ${className}`}>
      <div
        className="absolute inset-0 transition-colors duration-150"
        style={{ backgroundColor: colorHex, ...maskStyle }}
      />
      <img
        src={baseImage}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain mix-blend-luminosity"
        style={{ filter: 'grayscale(1)' }}
      />
    </div>
  );
}
