import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { resolveProductImage, useCatalog } from '../context/CatalogContext.jsx';
import { getEffectivePrice } from '../lib/pricing.js';

export default function ProductCard({ product }) {
  const { colors, currencyFormatter } = useCatalog();
  const defaultColor = colors.find((c) => c.id === product.availableColors[0]) || colors[0];
  const img = resolveProductImage(product, defaultColor.id);

  // Precio "Desde": el tamaño más barato, con su descuento si aplica.
  const cheapestSizeId = Object.entries(product.sizePricing).sort((a, b) => a[1] - b[1])[0][0];
  const { original, final, discountPercent } = getEffectivePrice(product, cheapestSizeId);

  return (
    <Link
      to={`/producto/${product.id}`}
      className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-400"
    >
      <ProductImage
        baseImage={img.src}
        colorHex={defaultColor.hex}
        alt={product.name}
        className="aspect-[4/3] w-full"
        tintable={img.tintable}
      />
      <div className="p-4">
        <h3 className="text-base font-medium">{product.name}</h3>
        <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{product.shortDescription}</p>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="text-sm font-medium">
            Desde {currencyFormatter.format(final)}
          </p>
          {discountPercent > 0 && (
            <>
              <p className="text-xs text-neutral-400 line-through">{currencyFormatter.format(original)}</p>
              <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                -{discountPercent}%
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
