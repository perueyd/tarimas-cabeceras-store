import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { categories, products } from '../data/catalog.js';

// Las pestañas se generan solas desde `categories` (catalog.js):
// al activar una categoría nueva, aparece aquí automáticamente.
const TABS = [
  { id: 'todos', label: 'Todos' },
  ...categories.filter((c) => c.active).map(({ id, label }) => ({ id, label })),
];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('categoria') || 'todos';
  const [tab, setTab] = useState(initialTab);

  const visibleProducts = products.filter((p) => tab === 'todos' || p.category === tab);

  function selectTab(id) {
    setTab(id);
    setSearchParams(id === 'todos' ? {} : { categoria: id });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Tarimas y cabeceras a tu medida
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-500">
          Elige el tamaño y el color, y visualiza el cambio al instante. Envíos a todo el Perú.
        </p>
      </section>

      <div className="mb-8 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              tab === t.id
                ? 'border-ink bg-ink text-white'
                : 'border-neutral-300 text-neutral-600 hover:border-neutral-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </main>
  );
}
