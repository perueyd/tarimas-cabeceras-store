// Muestra la imagen de un producto.
// tintable=true  -> tiñe la imagen base (foto en tonos grises) con el color elegido,
//                   usando blend modes CSS: el cambio es instantáneo y no necesita
//                   una foto distinta por cada color.
// tintable=false -> muestra la foto tal cual (para fotos reales ya con su acabado).
export default function ProductImage({ baseImage, colorHex, alt, className = '', tintable = true }) {
  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      <img src={baseImage} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
      {tintable && (
        <>
          <div
            className="absolute inset-0 mix-blend-multiply transition-colors duration-150"
            style={{ backgroundColor: colorHex }}
          />
          <div className="absolute inset-0 bg-white/30 mix-blend-overlay" />
        </>
      )}
    </div>
  );
}
