import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext.jsx';

// Sección de confianza de la portada: garantías del negocio + reseñas REALES.
//
// Antes esta sección mostraba cinco testimonios inventados bajo el título
// "Clientes Reales, Resultados Reales". Eran datos de ejemplo que se quedaron
// publicados: ni las personas, ni las compras, ni los comentarios existían.
// Además de engañar al cliente, en Perú eso es publicidad engañosa (INDECOPI).
//
// Ahora se leen las reseñas de verdad desde /api/reviews?recientes=1. Si aún no
// hay ninguna, la sección de opiniones simplemente NO se muestra: es preferible
// no tener testimonios a tenerlos falsos. En cuanto un cliente deje su primera
// reseña, aparece sola.

// Cada garantía se puede editar desde el panel (Editar página → Datos de la
// tienda). Los valores por defecto son los únicos que la propia web ya
// afirmaba en sus Preguntas Frecuentes, así que son ciertos.
const BADGES_POR_DEFECTO = [
  { icon: '📐', label: 'Hechos a medida', description: 'La medida que necesites' },
  { icon: '⚡', label: 'Entrega en 3-4 días', description: 'Días hábiles, en Lima' },
];

function Estrellas({ n }) {
  return (
    <span className="text-amber-500" aria-label={`${n} de 5 estrellas`}>
      {'★'.repeat(n)}
      <span className="text-neutral-300">{'★'.repeat(Math.max(5 - n, 0))}</span>
    </span>
  );
}

function haceCuanto(fecha) {
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  if (!Number.isFinite(dias) || dias < 0) return '';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 30) return `Hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'Hace un mes' : `Hace ${meses} meses`;
}

export default function RecentOrdersSection() {
  const { storeConfig } = useCatalog();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/reviews?recientes=1')
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d) => { if (!cancelado) setReviews(Array.isArray(d.reviews) ? d.reviews : []); })
      .catch(() => { /* sin reseñas: la sección no se muestra y ya */ });
    return () => { cancelado = true; };
  }, []);

  const badges = storeConfig?.garantias?.length ? storeConfig.garantias : BADGES_POR_DEFECTO;

  // El dueño puede apagar la franja de opiniones aunque ya tenga reseñas
  // (por ejemplo si las primeras no le convencen). Por defecto está encendida:
  // no se muestra igualmente hasta que exista alguna reseña real.
  const mostrarOpiniones = storeConfig?.mostrarOpiniones !== false && reviews.length > 0;

  return (
    <section className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${badges.length > 2 ? 'lg:grid-cols-4' : ''}`}>
          {badges.map((badge, i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-center transition hover:border-neutral-300 sm:p-6"
            >
              <div className="mb-2 text-3xl">{badge.icon}</div>
              <h3 className="text-sm font-semibold text-neutral-900 sm:text-base">{badge.label}</h3>
              <p className="mt-1 text-xs text-neutral-600">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Opiniones: solo si existen de verdad Y el dueño las tiene activadas. */}
      {mostrarOpiniones && (
        <div className="bg-gradient-to-b from-white to-neutral-50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16 md:py-20">
            <div className="mb-10">
              <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Lo que dicen nuestros clientes
              </h2>
              <p className="text-neutral-600">
                Opiniones de personas que compraron en E|D Espacios y Diseño
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reviews.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <Estrellas n={r.estrellas} />
                  <p className="mt-3 flex-1 text-sm italic leading-relaxed text-neutral-700">
                    “{r.comentario}”
                  </p>
                  <div className="mt-4 border-t border-neutral-100 pt-3">
                    <p className="text-sm font-medium text-neutral-900">{r.nombre}</p>
                    <Link
                      to={`/producto/${r.productId}`}
                      className="text-xs text-neutral-500 underline-offset-2 hover:text-ink hover:underline"
                    >
                      {r.productName}
                    </Link>
                    {haceCuanto(r.fecha) && (
                      <p className="mt-1 text-xs text-neutral-400">{haceCuanto(r.fecha)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="mb-4 text-neutral-600">¿Listo para tu mueble personalizado?</p>
              <Link
                to="/tienda"
                className="inline-block rounded-lg bg-neutral-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-black active:scale-95"
              >
                Explorar la tienda →
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
