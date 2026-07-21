import { Link, useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import RecommendedProducts from '../components/RecommendedProducts.jsx';

export default function Cart() {
  const { items, updateQty, removeItem, totalAmount, lineKey } = useCart();
  const { currencyFormatter, getColorById, getSizeById, getProductById: getProductByIdSafe } = useCatalog();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
        <Link to="/" className="mt-4 inline-block underline">Ver catálogo</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Tu carrito</h1>

      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {items.map((item) => {
          const color = getColorById(item.colorId);
          const size = getSizeById(item.sizeId);
          return (
            <div key={lineKey(item)} className="flex gap-4 p-4">
              <ProductImage
                baseImage={item.baseImage}
                colorHex={color.hex}
                alt={item.productName}
                className="h-20 w-24 flex-shrink-0 rounded-lg"
                tintable={item.tintable !== false}
              />
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-neutral-500">
                      {size.label} · {color.label}
                    </p>
                  </div>
                  <p className="font-medium">{currencyFormatter.format(item.unitPrice * item.qty)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-neutral-300">
                    <button
                      className="px-3 py-1"
                      onClick={() => updateQty(item, item.qty - 1)}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.qty}</span>
                    <button
                      className="px-3 py-1"
                      onClick={() => updateQty(item, item.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item)}
                    className="text-sm text-neutral-500 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-lg font-semibold">Total</p>
        <p className="text-lg font-semibold">{currencyFormatter.format(totalAmount)}</p>
      </div>

      <button
        onClick={() => navigate('/checkout')}
        className="mt-6 w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 sm:w-auto"
      >
        Proceder al pago
      </button>

      <RecommendedProducts
        excludeIds={items.map((i) => i.productId)}
        excludeCategories={[...new Set(items.map((i) => {
          const prod = getProductByIdSafe(i.productId);
          return prod?.category;
        }).filter(Boolean))]}
        title="Antes de pagar, ¿algo más para tu dormitorio?"
      />
    </main>
  );
}
