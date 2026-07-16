// Tiñe una imagen base en escala de grises con el color elegido, usando blend modes CSS.
// Así el cambio de color es instantáneo y no requiere una foto distinta por cada color.
// Si más adelante tienes fotos reales por color, basta con mapear color -> URL de foto
// y renderizar esa imagen en lugar de aplicar el filtro.
export default function ProductImage({ baseImage, colorHex, alt, className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      <img src={baseImage} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
      <div
        className="absolute inset-0 mix-blend-multiply transition-colors duration-150"
        style={{ backgroundColor: colorHex }}
      />
      <div className="absolute inset-0 bg-white/30 mix-blend-overlay" />
    </div>
  );
}
