import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ProductImage from '../components/ProductImage.jsx';
import ColorPicker from '../components/ColorPicker.jsx';
import { useCart } from '../context/CartContext.jsx';
import { colors, currencyFormatter, getProductById, sizes, storeConfig } from '../data/catalog.js';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = getProductById(id);
  const { addItem } = useCart();

  const availableSizes = product ? sizes.filter((s) => product.sizePricing[s.id] != null) : [];
  const availableColors = product ? colors.filter((c) => product.availableColors.includes(c.id)) : [];

  const [sizeId, setSizeId] = useState(availableSizes[0]?.id);
  const [colorId, setColorId] = useState(availableColors[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selectedColor = colors.find((c) => c.id === colorId);
  const unitPrice = useMemo(() => (product ? product.sizePricing[sizeId] : 0), [product, sizeId]);

  if (!product) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p>Producto no encontrado.</p>
        <Link to="/" className="mt-4 inline-block underline">Volver al catálogo</Link>
      </main>
    );
  }

  function handleAddToCart() {
    addItem({
      productId: product.id,
      productName: product.name,
      baseImage: product.baseImage,
      tintable: product.tintable !== false,
      sizeId,
      colorId,
      qty,
      unitPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    handleAddToCart();
    navigate('/carrito');
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/" className="text-sm text-neutral-500 hover:text-ink">← Volver al catálogo</Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductImage
          baseImage={product.baseImage}
          colorHex={selectedColor.hex}
          alt={product.name}
          className="aspect-[4/3] w-full rounded-xl"
          tintable={product.tintable !== false}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-neutral-500">{product.shortDescription}</p>
          <p className="mt-4 text-xl font-semibold">{currencyFormatter.format(unitPrice)}</p>

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium text-neutral-700">Tamaño</p>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSizeId(s.id)}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    sizeId === s.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  <span className="block font-medium">{s.label}</span>
                  <span className="block text-xs opacity-70">{s.dims}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <ColorPicker colors={availableColors} selectedId={colorId} onSelect={setColorId} />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <p className="text-sm font-medium text-neutral-700">Cantidad</p>
            <div className="flex items-center rounded-lg border border-neutral-300">
              <button
                className="px-3 py-1 text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-8 text-center">{qty}</span>
              <button className="px-3 py-1 text-lg" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAddToCart}
              className="flex-1 rounded-lg border border-ink px-6 py-3 text-sm font-medium transition hover:bg-neutral-100"
            >
              {added ? 'Añadido ✓' : 'Añadir al carrito'}
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Comprar ahora
            </button>
          </div>

          <p className="mt-4 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
            🚚 Fabricado a pedido — entrega en <span className="font-medium">{storeConfig.leadTime}</span>.
            Al pagar eliges la fecha y el rango de horario que te acomode.
          </p>

          <div className="mt-10">
            <h2 className="mb-3 text-sm font-medium text-neutral-700">Especificaciones</h2>
            <dl className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm">
              {Object.entries(product.specs).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-neutral-500">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </main>
  );
}
