import { useEffect, useState } from 'react';
import { currencyFormatter, getColorById, getSizeById, getProductById } from '../data/catalog.js';
import { Stars } from './ProductDetail.jsx';

// Panel de control del negocio: /pedidos
// Pestañas: Resumen de ventas + lista de pedidos | Reseñas de clientes.
// Protegido con la clave ORDERS_ADMIN_KEY (variable de entorno en Vercel).
export default function Orders() {
  const [key, setKey] = useState(() => localStorage.getItem('ed-orders-key') || '');
  const [input, setInput] = useState('');
  const [orders, setOrders] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('pedidos');
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
      fetch(`/api/reviews?all=1&key=${encodeURIComponent(k)}`)
        .then((r) => r.json())
        .then((d) => setReviews(d.reviews || []))
        .catch(() => {});
    } catch (err) {
      setError(err.message);
      setOrders(null);
    } finally {
      setLoading(false);
    }
  }

  async function borrarResena(r) {
    if (!window.confirm(`¿Eliminar la reseña de ${r.nombre}?`)) return;
    try {
      const res = await fetch(
        `/api/reviews?key=${encodeURIComponent(key)}&product=${encodeURIComponent(r.productId)}&id=${encodeURIComponent(r.id)}`,
        { method: 'DELETE' }
      );
      if (res.ok) setReviews(reviews.filter((x) => x.id !== r.id));
    } catch { /* no-op */ }
  }

  useEffect(() => {
    if (key) cargar(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!orders) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Panel del negocio</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Acceso privado. Ingresa tu clave de administrador.
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

  // ---- Estadísticas (estilo panel de ventas) ----
  const pagados = orders.filter((o) => o.estado === 'Pagado');
  const porVerificar = orders.filter((o) => o.estado !== 'Pagado');
  const hoy = new Date().toDateString();
  const ventasHoy = pagados
    .filter((o) => new Date(o.fecha).toDateString() === hoy)
    .reduce((sum, o) => sum + (o.monto || 0), 0);
  const totalVentas = pagados.reduce((sum, o) => sum + (o.monto || 0), 0);
  const totalPorVerificar = porVerificar.reduce((sum, o) => sum + (o.monto || 0), 0);
  const promedioEstrellas = reviews.length
    ? (reviews.reduce((s, r) => s + r.estrellas, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Panel del negocio</h1>
        <button
          onClick={() => cargar(key)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:border-ink"
        >
          {loading ? 'Actualizando...' : '↻ Actualizar'}
        </button>
      </div>

      {/* ---- Tarjetas de resumen ---- */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Ventas confirmadas" value={currencyFormatter.format(totalVentas)} sub={`${pagados.length} pedido${pagados.length !== 1 ? 's' : ''}`} />
        <StatCard label="Por verificar" value={currencyFormatter.format(totalPorVerificar)} sub={`${porVerificar.length} pedido${porVerificar.length !== 1 ? 's' : ''}`} accent />
        <StatCard label="Ventas de hoy" value={currencyFormatter.format(ventasHoy)} sub={new Date().toLocaleDateString('es-PE')} />
        <StatCard label="Calificación" value={`★ ${promedioEstrellas}`} sub={`${reviews.length} reseña${reviews.length !== 1 ? 's' : ''}`} />
      </div>

      {/* ---- Pestañas ---- */}
      <div className="mb-6 flex gap-2">
        {[
          { id: 'pedidos', label: `Pedidos (${orders.length})` },
          { id: 'resenas', label: `Reseñas (${reviews.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              tab === t.id ? 'border-ink bg-ink text-white' : 'border-neutral-300 text-neutral-600 hover:border-neutral-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pedidos' && (
        <div className="space-y-4">
          {orders.length === 0 && (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              Aún no hay pedidos registrados.
            </p>
          )}
          {orders.map((o) => (
            <div key={o.code} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold">{o.code}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    o.estado === 'Pagado' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {o.estado} · {o.metodo}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-neutral-500">Cliente:</span> {o.nombre} · {o.telefono}</p>
                <p><span className="text-neutral-500">Monto:</span> {currencyFormatter.format(o.monto)}</p>
                <p><span className="text-neutral-500">Entrega:</span> {o.entrega || '—'}</p>
                <p><span className="text-neutral-500">Fecha:</span> {new Date(o.fecha).toLocaleString('es-PE')}</p>
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
      )}

      {tab === 'resenas' && (
        <div className="space-y-4">
          {reviews.length === 0 && (
            <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500">
              Aún no hay reseñas de clientes.
            </p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{r.nombre}</p>
                  <p className="text-xs text-neutral-500">
                    {getProductById(r.productId)?.name || r.productId} · {new Date(r.fecha).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Stars n={r.estrellas} size="text-sm" />
                  <button
                    onClick={() => borrarResena(r)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-neutral-600">{r.comentario}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-amber-200 bg-amber-50' : 'border-neutral-200 bg-white'}`}>
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-neutral-400">{sub}</p>
    </div>
  );
}
