import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';

export default function Home() {
  const { categories, products, storeConfig } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  // La categoría se deriva SIEMPRE de la dirección, no de un estado aparte.
  // Con un useState que solo leía la URL al montar, el botón "Atrás" del
  // navegador y el enlace "Tienda" del menú cambiaban la dirección pero
  // dejaban la lista filtrada como estaba: parecía que faltaban productos.
  const tab = searchParams.get('categoria') || 'todos';
  const [busqueda, setBusqueda] = useState('');

  // Las pestañas se generan solas desde `categories` (editable desde el panel):
  // al activar una categoría nueva, aparece aquí automáticamente.
  const TABS = [
    { id: 'todos', label: 'Todos' },
    ...categories.filter((c) => c.active).map(({ id, label }) => ({ id, label })),
  ];

  // Filtra por categoría y por texto (nombre o descripción). Sin tildes y en
  // minúsculas para que "cabecera" encuentre "Cabecera" y "capitoné".
  const normaliza = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = normaliza(busqueda.trim());
  const visibleProducts = products.filter((p) => {
    if (p.oculto) return false; // borradores no se muestran a los clientes
    const enCategoria = tab === 'todos' || p.category === tab;
    if (!q) return enCategoria;
    const texto = normaliza(`${p.name} ${p.shortDescription || ''}`);
    return enCategoria && texto.includes(q);
  });

  function selectTab(id) {
    setSearchParams(id === 'todos' ? {} : { categoria: id });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {(tab === 'todos' ? 'Muebles' : categories.find((c) => c.id === tab)?.label || 'Muebles')} a tu medida
        </h1>
        <p className="mt-2 max-w-2xl text-neutral-500">
          Elige el tamaño y el color, y visualiza el cambio al instante. Envíos a todo el Perú.
        </p>
      </section>

      <div className="mb-5">
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔎</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar mueble (ej. cabecera, capitoné...)"
            className="w-full rounded-full border border-neutral-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-ink"
          />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
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

      {visibleProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : q ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-14 text-center">
          <p className="text-lg font-medium">Sin resultados para «{busqueda.trim()}» 🔎</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Prueba con otra palabra, o escríbenos y te ayudamos a encontrar lo que buscas.
          </p>
          <button
            onClick={() => setBusqueda('')}
            className="mt-6 rounded-lg border border-neutral-300 px-6 py-2.5 text-sm font-medium transition hover:border-ink"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-14 text-center">
          <p className="text-lg font-medium">Esta línea está en preparación 🛠️</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Muy pronto tendremos {categories.find((c) => c.id === tab)?.label?.toLowerCase() || 'estos productos'} en
            el catálogo. Si lo necesitas ya, escríbenos y te lo cotizamos a medida.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {storeConfig.whatsapp && (
              <a
                href={`https://wa.me/${storeConfig.whatsapp}?text=${encodeURIComponent('Hola, me interesa un mueble a medida de la línea ' + (categories.find((c) => c.id === tab)?.label || '') + '. ¿Me pueden cotizar?')}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-[#25D366] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Cotizar por WhatsApp
              </a>
            )}
            <button
              onClick={() => selectTab('todos')}
              className="rounded-lg border border-neutral-300 px-6 py-2.5 text-sm font-medium transition hover:border-ink"
            >
              Ver productos disponibles
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
