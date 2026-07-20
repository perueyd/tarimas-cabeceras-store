import { useEffect, useState } from 'react';
import { currencyFormatter, getColorById, getSizeById } from '../data/catalog.js';

// Panel privado del negocio: /pedidos
// Pide la clave (ORDERS_ADMIN_KEY en Vercel) y lista los pedidos registrados.
export default function Orders() {
  const [key, setKey] = useState(() => localStorage.getItem('ed-orders-key') || '');
  const [input, setInput] = useState('');
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function cargar(k) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/orders?key=${encodeURIComponent(k)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar.');
      setOrders(data.orders);
      localStorage.setItem('ed-orders-key', k);
      setKey(k);
    } catch (err) {
      setError(err.message);
      setOrders(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (key) cargar(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!orders) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Panel privado del negocio. Ingresa tu clave de administrador.
        </p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input) cargar(input);
          }}
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Clave de administrador"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <button className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos ({orders.length})</h1>
        <button
          onClick={() => cargar(key)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:border-ink"
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {orders.length === 0 && (
        <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
          Aún no hay pedidos registrados.
        </p>
      )}

      <div className="space-y-4">
        {orders.map((o) => (
          <div key={o.code} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-sm font-semibold">{o.code}</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  o.estado === 'Pagado'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {o.estado} · {o.metodo}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-neutral-500">Cliente:</span> {o.nombre} · {o.telefono}</p>
              <p><span className="text-neutral-500">Monto:</span> {currencyFormatter.format(o.monto)}</p>
              <p><span className="text-neutral-500">Entrega:</span> {o.entrega || '—'}</p>
              <p><span className="text-neutral-500">Fecha del pedido:</span> {new Date(o.fecha).toLocaleString('es-PE')}</p>
              <p className="sm:col-span-2"><span className="text-neutral-500">Dirección:</span> {o.direccion || '—'} ({o.zona})</p>
              {o.ubicacion && (
                <p className="sm:col-span-2">
                  <a href={o.ubicacion} target="_blank" rel="noreferrer" className="text-sky-700 underline">
                    📍 Ver punto de entrega en el mapa
                  </a>
                </p>
              )}
            </div>
            {o.items?.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-xs text-neutral-600">
                {o.items.map((i, idx) => (
                  <li key={idx}>
                    • {i.productName} x{i.qty} — {getSizeById(i.sizeId)?.label || i.sizeId},{' '}
                    {getColorById(i.colorId)?.label || i.colorId} — {currencyFormatter.format(i.unitPrice * i.qty)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
