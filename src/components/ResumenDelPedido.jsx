import { Link } from 'react-router-dom';
import ProductImage from './ProductImage.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { fotoChica } from '../lib/fotoChica.js';
import { esLineaDeServicio } from '../lib/servicios.js';

// «Tu pedido» arriba del pago (pedido del dueño, 27/11/2026): el pago solo
// enseñaba el total al final y el cliente no veía qué estaba pagando. Se
// pliega para no empujar el formulario en el celular; el total que se cobra
// sigue saliendo abajo, junto al botón, con los descuentos ya aplicados.
export default function ResumenDelPedido({ items, totalProductos }) {
  const { currencyFormatter, getColorById, getSizeById, getProductById } = useCatalog();
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
                  {' · '}Cantidad: {item.qty}
                </p>
                {item.opcionesDetalle?.length > 0 && (
                  <p className="text-xs text-neutral-400">
                    {item.opcionesDetalle.map((d) => `${d.grupoLabel}: ${d.valorLabel}`).join(' · ')}
                  </p>
                )}
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
