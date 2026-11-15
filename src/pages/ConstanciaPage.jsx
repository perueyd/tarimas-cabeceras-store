import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Constancia from '../components/Constancia.jsx';
import HojaImprimible from '../components/HojaImprimible.jsx';
import { useMeta } from '../lib/meta.js';
import { TITULO_CONSTANCIA } from '../lib/constancia.js';

// La constancia de un pedido, para quien tiene su código.
//
// Trae lo mismo que el seguimiento: el pedido, sin datos personales. La
// versión con nombre y documento solo la saca el dueño desde su panel.
export default function ConstanciaPage() {
  useMeta({ titulo: TITULO_CONSTANCIA });
  const [params] = useSearchParams();
  const codigo = (params.get('codigo') || '').trim();
  const [pedido, setPedido] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!codigo) {
      setError('Falta el código del pedido.');
      return undefined;
    }
    let cancelado = false;
    fetch(`/api/orders?code=${encodeURIComponent(codigo)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'No encontramos ese pedido.');
        if (!cancelado) setPedido(data.order);
      })
      .catch((err) => {
        if (!cancelado) setError(err.message);
      });
    return () => {
      cancelado = true;
    };
  }, [codigo]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-neutral-700">{error}</p>
        <Link to="/seguimiento" className="mt-4 inline-block text-sm underline">
          Buscar mi pedido
        </Link>
      </main>
    );
  }
  if (!pedido) {
    return <main className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-neutral-500">Cargando…</main>;
  }

  return (
    <main className="bg-neutral-100 py-6 sm:py-10">
      <div className="mx-auto mb-4 flex max-w-2xl flex-wrap items-center justify-between gap-2 px-4 sm:px-0">
        <Link to={`/seguimiento?codigo=${encodeURIComponent(pedido.code)}`} className="text-sm text-neutral-600 underline">
          ← Seguimiento del pedido
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
        >
          Imprimir o guardar en PDF
        </button>
      </div>
      <div className="mx-auto max-w-2xl shadow-sm">
        <Constancia pedido={pedido} />
      </div>
      <HojaImprimible>
        <Constancia pedido={pedido} />
      </HojaImprimible>
    </main>
  );
}
