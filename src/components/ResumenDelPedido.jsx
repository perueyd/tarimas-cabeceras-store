import { Link, useNavigate } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { fotoChica } from '../lib/fotoChica.js';
import { esLineaDeServicio } from '../lib/servicios.js';

// «Tu pedido» arriba del pago (pedido del dueño, 27/11/2026): el pago solo
// enseñaba el total al final y el cliente no veía qué estaba pagando. Se
// pliega para no empujar el formulario en el celular; el total que se cobra
// sigue saliendo abajo, junto al botón, con los descuentos ya aplicados.
//
// La cantidad se cambia y el producto se quita aquí mismo, sin ir al carrito.
// Medida y color no: cambian el precio y la foto, y se eligen en la ficha
// (el enlace «Cambiar medida o color» lleva a ella). Si se quita lo último,
// se va al carrito: un pago sin productos no tiene nada que cobrar.
export default function ResumenDelPedido({ items, totalProductos }) {
  const { currencyFormatter, getColorById, getSizeById, getProductById } = useCatalog();
  const { updateQty, removeItem } = useCart();
  const navigate = useNavigate();
  const unidadesDe = (item) => items.filter((i) => i !== item).reduce((n, i) => n + i.qty, 0);
  function quitar(item) {
    removeItem(item);
    if (unidadesDe(item) === 0) navigate('/carrito');
  }
  function restar(item) {
    if (item.qty <= 1) quitar(item);
    else updateQty(item, item.qty - 1);
  }
  const unidades = items.reduce((n, i) => n + i.qty, 0);

  return (
    <details open className="mb-6 rounded-lg border border-neutral-200 bg-white">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="font-medium">
          Tu pedido · {unidades} {unidades === 1 ? 'producto' : 'productos'}
        </span>
        <span className="font-semibold">{currencyFormatter.format(totalProductos)}</span>
      </summary>
      <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
        {items.map((item, n) => {
          const producto = getProductById(item.productId);
          const color = getColorById(item.colorId);
          const servicio = esLineaDeServicio(item);
          return (
            <li key={n} className="flex gap-3 px-4 py-3">
              {servicio && !item.baseImage ? (
                <div className="flex h-14 w-16 flex-shrink-0 items-center justify-center rounded-md bg-neutral-900 text-[9px] font-semibold uppercase tracking-widest text-white">
                  Servicio
                </div>
              ) : (
                <ProductImage
                  baseImage={fotoChica(item.baseImage)}
                  colorHex={color?.hex}
                  colorHex2={getColorById(item.colorId2)?.hex}
                  alt={item.productName}
                  className="h-14 w-16 flex-shrink-0 rounded-md"
                  tintable={item.tintable !== false}
                  zonasManual={producto?.zonasFoto?.[item.baseImage]}
                  invertirTelas={producto?.invertirTelas}
                />
              )}
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-neutral-500">
                  {servicio
                    ? 'Servicio'
                    : `${getSizeById(item.sizeId)?.label || item.sizeId} · ${color?.label || item.colorId}${
                        item.colorId2 ? ` + ${getColorById(item.colorId2)?.label || item.colorId2}` : ''
                      }`}
                </p>
                {item.opcionesDetalle?.length > 0 && (
                  <p className="text-xs text-neutral-400">
                    {item.opcionesDetalle.map((d) => `${d.grupoLabel}: ${d.valorLabel}`).join(' · ')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="flex items-center rounded-md border border-neutral-300">
                    <button
                      type="button"
                      aria-label={`Quitar una unidad de ${item.productName}`}
                      onClick={() => restar(item)}
                      className="px-2.5 py-0.5"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-xs">{item.qty}</span>
                    <button
                      type="button"
                      aria-label={`Añadir una unidad de ${item.productName}`}
                      onClick={() => updateQty(item, item.qty + 1)}
                      className="px-2.5 py-0.5"
                    >
                      +
                    </button>
                  </div>
                  <button type="button" onClick={() => quitar(item)} className="text-xs text-neutral-500 underline">
                    Quitar
                  </button>
                  {!servicio && producto && (
                    <Link to={`/producto/${item.productId}`} className="text-xs text-neutral-500 underline">
                      Cambiar medida o color
                    </Link>
                  )}
                </div>
              </div>
              <p className="whitespace-nowrap text-sm font-medium">{currencyFormatter.format(item.unitPrice * item.qty)}</p>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500">
        <span>Los descuentos y el total a pagar se ven abajo, junto al botón de pago.</span>
        <Link to="/carrito" className="ml-3 whitespace-nowrap font-medium text-neutral-800 underline">
          Editar carrito
        </Link>
      </div>
    </details>
  );
}
