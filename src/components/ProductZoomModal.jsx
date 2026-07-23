import { useEffect } from 'react';
import ProductImage from './ProductImage.jsx';
import ColorPicker from './ColorPicker.jsx';

// Ventana ampliada del producto: la imagen grande del modelo, un cuadro grande
// con el color/tela elegido, y el selector de color — todo junto para que el
// cliente aprecie bien el tono antes de comprar.
export default function ProductZoomModal({
  open,
  onClose,
  img,
  selectedColor,
  selectedColor2,
  availableColors,
  colorId,
  colorId2,
  onSelectColor,
  onSelectColor2,
  dosTelas,
  setDosTelas,
  aviso,
  productName,
}) {
  // Cerrar con la tecla Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Vista ampliada de ${productName}`}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
        >
          ✕
        </button>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Imagen grande del modelo */}
          <ProductImage
            baseImage={img.src}
            colorHex={selectedColor?.hex}
            colorHex2={selectedColor2?.hex}
            onDosTelas={setDosTelas}
            alt={productName}
            className="aspect-square w-full rounded-xl"
            tintable={img.tintable}
          />

          {/* Cuadro grande del color/tela + selector */}
          <div>
            <p className="text-lg font-semibold tracking-tight">{productName}</p>

            <div className="mt-4 flex items-center gap-4">
              <Cuadro color={selectedColor} label={dosTelas ? 'Color principal' : 'Color elegido'} />
              {dosTelas && <Cuadro color={selectedColor2} label="Color del detalle" />}
            </div>

            <div className="mt-6">
              <ColorPicker
                colors={availableColors}
                selectedId={colorId}
                onSelect={onSelectColor}
                titulo={dosTelas ? 'Color principal' : 'Color'}
                aviso={dosTelas ? undefined : aviso}
              />
            </div>

            {dosTelas && (
              <div className="mt-5">
                <ColorPicker
                  colors={availableColors}
                  selectedId={colorId2}
                  onSelect={onSelectColor2}
                  titulo="Color del detalle"
                  aviso={aviso}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Cuadro grande que muestra el color elegido: la foto real de la tela si la hay,
// o el color plano; con su nombre debajo.
function Cuadro({ color, label }) {
  if (!color) return null;
  return (
    <div className="text-center">
      <div
        className="h-20 w-20 rounded-xl border border-black/10 bg-cover bg-center"
        style={color.img ? { backgroundImage: `url(${color.img})` } : { backgroundColor: color.hex }}
      />
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
      <p className="text-sm font-medium">{color.label}</p>
    </div>
  );
}
