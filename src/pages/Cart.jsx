import { Link, useNavigate } from 'react-router-dom';
import { reglaDelPedido, reglasDeEntrega, textoDePlazo, tipoDeEntrega } from '../lib/entrega.js';
import ProductImage from '../components/ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import RecommendedProducts from '../components/RecommendedProducts.jsx';
import { getUnitPrice } from '../lib/pricing.js';
import { fotoChica } from '../lib/fotoChica.js';
import { useMeta } from '../lib/meta.js';
import { esLineaDeServicio } from '../lib/servicios.js';

export default function Cart() {
  useMeta({ titulo: 'Tu carrito', descripcion: 'Revisa los muebles que elegiste antes de completar tu compra.' });

  const { items, updateQty, removeItem, totalAmount, lineKey } = useCart();
  const { currencyFormatter, getColorById, getSizeById, getProductById: getProductByIdSafe, storeConfig } = useCatalog();
  const navigate = useNavigate();

  // El plazo sale de la MISMA regla que la ficha y el pago (src/lib/entrega.js),
  // con lo que hay en el carrito: con una cabecera y una tarima manda la más
  // exigente. Los servicios se coordinan aparte y no cuentan.
  const productosDelCarrito = items.filter((i) => !esLineaDeServicio(i));
  const plazo = productosDelCarrito.length
    ? textoDePlazo(reglaDelPedido(reglasDeEntrega(storeConfig), productosDelCarrito.map((i) => tipoDeEntrega(getProductByIdSafe(i.productId)))))
    : '';
  const envioTexto = storeConfig?.envioTexto || '';

  // La garantía solo se enseña si TODOS los productos del carrito dicen la
  // misma: con una cabecera de 5 años y un colchón de 1, poner "Garantía 5
  // años" debajo del total sería prometer de más sobre el colchón.
  const garantias = new Set(
    items.map((i) => getProductByIdSafe(i.productId)?.specs?.['Garantía']).filter(Boolean)
  );
  const garantia = garantias.size === 1 ? [...garantias][0] : '';

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
        <Link to="/tienda" className="mt-4 inline-block underline">Ver catálogo</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      {/* Faltaba cómo volver a la tienda sin usar el botón del navegador
          (lo pidió el dueño, 27/11/2026). */}
      <Link to="/tienda" className="text-sm text-neutral-500 hover:text-ink">
        ← Seguir comprando
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold tracking-tight">Tu carrito</h1>

      <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
        {items.map((item) => {
          const color = getColorById(item.colorId);
          const size = getSizeById(item.sizeId);
          const product = getProductByIdSafe(item.productId);
          const priceInfo = product ? getUnitPrice(product, item.sizeId, item.opciones) : null;
          return (
            <div key={lineKey(item)} className="flex gap-4 p-4">
              {/* Un plan de servicio puede no tener foto, y entonces el recuadro
                  de «Foto próximamente» (pensado para un mueble) no viene a
                  cuento: se pinta un recuadro que dice lo que es. */}
              {esLineaDeServicio(item) && !item.baseImage ? (
                <div className="flex h-20 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                  Servicio
                </div>
              ) : (
              /* La versión liviana: esta foto se ve a 96 px y se estaba
                 descargando entera (unos 130 KB para una miniatura). Es la
                 misma que ya usan las tarjetas del catálogo. */
              <ProductImage
                baseImage={fotoChica(item.baseImage)}
                colorHex={color?.hex}
                colorHex2={getColorById(item.colorId2)?.hex}
                alt={item.productName}
                className="h-20 w-24 flex-shrink-0 rounded-lg"
                tintable={item.tintable !== false}
                // Misma corrección de zonas que en la página del producto: el
                // carrito tiene que mostrar exactamente lo que el cliente eligió.
                zonasManual={product?.zonasFoto?.[item.baseImage]}
                invertirTelas={product?.invertirTelas}
              />
              )}
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    {/* Un plan de servicio no tiene tamaño ni color: sin esta
                        rama su renglón diría «servicio · » y nada más. */}
                    <p className="text-sm text-neutral-500">
                      {esLineaDeServicio(item) ? (
                        'Servicio'
                      ) : (
                        <>
                          {size?.label || item.sizeId} · {color?.label || item.colorId}
                          {item.colorId2 && ` + ${getColorById(item.colorId2)?.label || item.colorId2}`}
                        </>
                      )}
                    </p>
                    {item.opcionesDetalle?.length > 0 && (
                      <p className="text-xs text-neutral-400">
                        {item.opcionesDetalle.map((d) => `${d.grupoLabel}: ${d.valorLabel}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{currencyFormatter.format(item.unitPrice * item.qty)}</p>
                    {priceInfo?.discountPercent > 0 && (
                      <p className="text-xs text-neutral-400 line-through">
                        {currencyFormatter.format((priceInfo.original + priceInfo.extra) * item.qty)}
                      </p>
                    )}
                  </div>
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

      {/* El plazo y la garantía, en el momento en que se decide pagar.

          POR QUÉ: la ficha del producto promete el plazo de entrega y los años
          de garantía, y el carrito los dejaba caer justo cuando el cliente
          duda. Son sus dos motivos para confiar y desaparecían en el último
          paso.

          Los textos NO se inventan aquí: el plazo es el que está escrito en el
          panel y la garantía sale de la ficha de los productos del carrito.
          Si el dueño no los ha puesto, no se enseña nada. */}
      {/* El costo del envío va aparte y más visible que el resto: es el dato
          que falta para saber cuánto se paga en total, y no tenerlo es lo que
          más carritos abandona. */}
      {envioTexto && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          📦 {envioTexto}
        </p>
      )}

      {(plazo || garantia) && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500">
          {plazo && <span>🚚 {plazo}</span>}
          {garantia && <span>🛡️ Garantía {garantia}</span>}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate('/checkout')}
          className="w-full rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 sm:w-auto"
        >
          Proceder al pago
        </button>
        <Link
          to="/tienda"
          className="w-full rounded-lg border border-neutral-300 px-6 py-3 text-center text-sm font-medium transition hover:border-neutral-500 sm:w-auto"
        >
          Seguir comprando
        </Link>
      </div>

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
