import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { colors, currencyFormatter } from '../data/catalog.js';

export default function ProductCard({ product }) {
  const defaultColor = colors.find((c) => c.id === product.availableColors[0]);
  const minPrice = Math.min(...Object.values(product.sizePricing));

  return (
    <Link
      to={`/producto/${product.id}`}
      className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-400"
    >
      <ProductImage
        baseImage={product.baseImage}
        colorHex={defaultColor.hex}
        alt={product.name}
        className="aspect-[4/3] w-full"
      />
      <div className="p-4">
        <h3 className="text-base font-medium">{product.name}</h3>
        <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{product.shortDescription}</p>
        <p className="mt-3 text-sm font-medium">
          Desde {currencyFormatter.format(minPrice)}
        </p>
      </div>
    </Link>
  );
}
