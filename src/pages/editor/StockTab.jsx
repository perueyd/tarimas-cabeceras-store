import { useState } from 'react';
import { reglaDelPedido, reglasDeEntrega, textoDePlazo, TIPO_STOCK } from '../../lib/entrega.js';

// Pestaña Stock (sugerencia del dueño, 25/11/2026).
//
// Hoy todo se fabrica a pedido. Si algún día hay muebles ya hechos, se marcan
// aquí y la tienda les da la regla «En stock» (panel → Entrega): entrega
// inmediata en vez del plazo de fabricación, en la ficha, el carrito, el pago
// y CHAT-ED. Es un sí/no por producto, a propósito sin contador de unidades:
// cuando se acaba, se desmarca. Un contador que no se descuenta solo
// prometería entregas que no se pueden cumplir.

export function StockTab({ catalog, api, flash }) {
  const productos = (catalog.products || []).filter((p) => !p.esServicio);
  const [enStock, setEnStock] = useState(() => new Set(productos.filter((p) => p.enStock).map((p) => p.id)));
  const [guardando, setGuardando] = useState(null);
  const regla = reglaDelPedido(reglasDeEntrega(catalog.storeConfig || {}), [TIPO_STOCK]);

  async function cambiar(p, si) {
    setGuardando(p.id);
    try {
      await api('POST', 'product', { ...p, enStock: si });
      setEnStock((prev) => {
        const nuevo = new Set(prev);
        if (si) nuevo.add(p.id);
        else nuevo.delete(p.id);
        return nuevo;
      });
      flash(si ? `«${p.name}» marcado en stock: entrega inmediata.` : `«${p.name}» vuelve a fabricarse a pedido.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Productos en stock</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Marca solo lo que ya tienes hecho y listo para entregar. Lo marcado se ofrece con entrega inmediata; lo
          demás sigue con su plazo de fabricación. Cuando se te acabe, desmárcalo.
        </p>
        <p className="mt-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          El cliente lee: «{textoDePlazo(regla)}» (se cambia en la pestaña Entrega, fila «En stock»).
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          {enStock.size === 0 ? 'Ahora mismo todo se fabrica a pedido.' : `${enStock.size} producto(s) en stock.`}
        </p>
      </div>
      <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
        {productos.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0 truncate text-sm">
              {p.name}
              {p.oculto && <span className="ml-2 text-xs text-neutral-400">(oculto)</span>}
            </span>
            <label className="flex shrink-0 items-center gap-2 text-xs text-neutral-700">
              <input
                type="checkbox"
                checked={enStock.has(p.id)}
                disabled={guardando === p.id}
                onChange={(e) => cambiar(p, e.target.checked)}
                className="h-4 w-4"
              />
              En stock
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
