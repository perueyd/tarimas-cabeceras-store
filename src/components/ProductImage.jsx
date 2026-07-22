// Muestra la imagen de un producto.
// tintable=true  -> tiñe la imagen base (foto en tonos grises, o el mueble
//                   recortado sin fondo) con el color elegido, usando blend
//                   modes CSS: el cambio es instantáneo y no necesita una
//                   foto distinta por cada color.
//                   El tinte usa la MISMA imagen como máscara (su canal de
//                   transparencia), así que si subes una foto SIN FONDO
//                   (PNG transparente), el color solo pinta el mueble — el
//                   espacio vacío alrededor queda intacto. Con una foto JPG
//                   (sin transparencia posible), el tinte cubre el rectángulo
//                   completo, como antes.
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
    <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      <img src={baseImage} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
      {tintable && (
        <>
          <div
            className="absolute inset-0 mix-blend-multiply transition-colors duration-150"
            style={{ backgroundColor: colorHex, ...maskStyle }}
          />
          <div className="absolute inset-0 bg-white/30 mix-blend-overlay" style={maskStyle} />
        </>
      )}
    </div>
  );
}
