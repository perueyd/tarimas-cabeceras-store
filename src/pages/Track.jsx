import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { currencyFormatter } from '../data/catalog.js';

// Etapas del pedido -> porcentaje de avance y color del círculo.
const ETAPAS = {
  'Pago por verificar': { pct: 20, label: 'Pago por verificar', desc: 'Estamos confirmando tu pago.', color: '#d97706' },
  Pagado: { pct: 60, label: 'Pago confirmado', desc: 'Tu mueble está en fabricación/preparación.', color: '#0284c7' },
  Entregado: { pct: 100, label: '¡Entregado!', desc: 'Tu pedido ya fue entregado.', color: '#16a34a' },
  Cancelado: { pct: 0, label: 'Pedido cancelado', desc: 'Este pedido fue cancelado.', color: '#dc2626' },
};

export default function Track() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('codigo') || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function buscar(codigoBuscado) {
    const c = (codigoBuscado ?? code).trim();
    if (!c) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await fetch(`/api/orders?code=${encodeURIComponent(c)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No encontramos ese pedido.');
      setOrder(data.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.get('codigo')) buscar(params.get('codigo'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const etapa = order ? ETAPAS[order.estado] || ETAPAS['Pago por verificar'] : null;
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = etapa ? c * (1 - etapa.pct / 100) : c;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Rastrea tu pedido</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Ingresa el código que recibiste al comprar (ej. <span className="font-mono">ED-XXXXXXXX</span>).
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          buscar();
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ED-XXXXXXXX"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono uppercase outline-none focus:border-ink"
        />
        <button className="rounded-lg bg-ink px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {order && etapa && (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-8">
          <div className="relative h-40 w-40">
            <svg width="160" height="160" viewBox="0 0 140 140" className="-rotate-90">
              <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e5e5" strokeWidth="10" />
              <circle
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={etapa.color}
                strokeWidth="10"
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset .6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold tabular-nums" style={{ color: etapa.color }}>
                {etapa.pct}%
              </span>
            </div>
          </div>

          <p className="mt-4 text-lg font-medium">{etapa.label}</p>
          <p className="text-sm text-neutral-500">{etapa.desc}</p>
          <p className="mt-2 font-mono text-xs text-neutral-400">{order.code}</p>

          <div className="mt-6 w-full space-y-2 border-t border-neutral-100 pt-6 text-sm">
            <p><span className="text-neutral-500">Fecha del pedido:</span> {new Date(order.fecha).toLocaleDateString('es-PE')}</p>
            <p><span className="text-neutral-500">Entrega:</span> {order.entrega || 'por confirmar'}</p>
            <p><span className="text-neutral-500">Monto:</span> {currencyFormatter.format(order.monto)}</p>
            {order.items?.length > 0 && (
              <p>
                <span className="text-neutral-500">Productos:</span>{' '}
                {order.items.map((i) => `${i.productName} x${i.qty}`).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
