import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { resolveProductImage, useCatalog } from '../context/CatalogContext.jsx';
import { getEffectivePrice } from '../lib/pricing.js';
import { fotoChica } from '../lib/fotoChica.js';

export default function ProductCard({ product, sizeId = null }) {
  const { colors, currencyFormatter } = useCatalog();
  const defaultColor = colors.find((c) => c.id === (product.availableColors || [])[0]) || colors[0];
  const img = resolveProductImage(product, defaultColor?.id, sizeId || undefined);

  // Con una medida elegida en el catálogo se muestra el precio DE ESA MEDIDA;
  // sin ella, el "Desde" del tamaño más barato. Un "desde S/400" cuando el
  // cliente ya dijo que su cama es King induce a error: la King cuesta otra
  // cosa y se entera recién al abrir el producto.
  const tamanoConPrecio = sizeId && product.sizePricing?.[sizeId] != null ? sizeId : null;
  const cheapestSizeId = Object.entries(product.sizePricing || {}).sort((a, b) => a[1] - b[1])[0]?.[0];
  const usado = tamanoConPrecio || cheapestSizeId;
  const priceInfo = usado ? getEffectivePrice(product, usado) : null;
  const { original, final, discountPercent } = priceInfo || {};

  return (
    <Link
      // Si venía filtrando por medida, el producto se abre YA en esa medida:
      // así no tiene que volver a elegirla ni se lleva la sorpresa del precio.
      to={`/producto/${product.id}${tamanoConPrecio ? `?tamano=${tamanoConPrecio}` : ''}`}
      className="group block overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:border-neutral-300 hover:-translate-y-1"
    >
      <div className="relative overflow-hidden bg-neutral-50">
        <ProductImage
          // Versión liviana: en el catálogo se cargan las 34 fotos de golpe y
          // en una tarjeta chica no se distingue de la grande. La foto en
          // tamaño completo se sigue usando en la ficha del producto.
          baseImage={fotoChica(img.src)}
          colorHex={defaultColor.hex}
          alt={product.name}
          className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-105"
          tintable={img.tintable}
          mostrarColor={false}
        />
        {discountPercent > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-md sm:right-3 sm:top-3 sm:px-2.5 sm:py-1">
            -{discountPercent}%
          </span>
        )}
      </div>
      {/* En el celular van dos tarjetas por fila: sin la descripción y con
          menos relleno, para que el nombre y el precio se lean enteros. */}
      <div className="p-3 sm:p-5">
        <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 sm:text-base">{product.name}</h3>
        <p className="mt-2 hidden text-xs leading-relaxed text-neutral-500 line-clamp-2 sm:block">{product.shortDescription}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 sm:mt-4">
          <p className="text-sm font-bold text-neutral-900">
            {priceInfo
              ? tamanoConPrecio
                ? currencyFormatter.format(final)
                : `Desde ${currencyFormatter.format(final)}`
              : 'Precio por confirmar'}
          </p>
          {discountPercent > 0 && original && (
            <p className="text-xs text-neutral-400 line-through">{currencyFormatter.format(original)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
