import ProductCard from './ProductCard.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';

// Venta cruzada: si el cliente ve/compra una cabecera, sugiere productos de
// OTRAS categorías (ej. una tarima o un velador) — no más de lo mismo.
// Si no hay suficientes productos en otras categorías, cae a la misma
// categoría antes que no mostrar nada.
export default function RecommendedProducts({ excludeIds = [], excludeCategories = [], title = 'También te puede interesar', limit = 3 }) {
  const { products } = useCatalog();

  const disponibles = products.filter((p) => !excludeIds.includes(p.id));
  const otrasCategorias = disponibles.filter((p) => !excludeCategories.includes(p.category));
  const pool = otrasCategorias.length > 0 ? otrasCategorias : disponibles;

  const seed = excludeIds.join(',');
  const picks = [...pool]
    .map((p) => ({ p, score: hash(p.id + seed) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.p);

  if (picks.length === 0) return null;

  return (
    <section className="mt-12 border-t border-neutral-200 pt-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

// Hash simple y estable: mismo producto + mismo contexto -> mismo orden
// (para que no salte cada vez que renderiza, pero varíe entre productos).
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}
