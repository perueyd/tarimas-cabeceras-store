import { Link } from 'react-router-dom';
import { useCatalog } from '../context/CatalogContext.jsx';
import { hayServicios, planesVisibles, proyectosVisibles, textosDeServicios } from '../lib/servicios.js';

// Franja de la portada que lleva a la página de servicios.
//
// La portada habla solo de muebles, y casi todas las visitas entran por ahí:
// sin esta franja, quien busca diseño de interiores tendría que adivinar que
// existe un enlace arriba. Solo se pinta cuando hay algo publicado, y las
// fotos que enseña son las de los proyectos reales del portafolio.
export default function ServiciosEnPortada() {
  const catalog = useCatalog();
  if (!hayServicios(catalog)) return null;

  const textos = textosDeServicios(catalog.storeConfig);
  const planes = planesVisibles(catalog.services);
  const proyectos = proyectosVisibles(catalog.projects);
  const areas = [...new Set([...planes, ...proyectos].map((x) => x.area).filter(Boolean))];
  // Hasta tres fotos: primero las portadas de los proyectos y, si no alcanzan,
  // las de los planes.
  const fotos = [...new Set([...proyectos.map((p) => p.fotos[0]), ...planes.map((p) => p.foto).filter(Boolean)])].slice(0, 3);

  return (
    <section className="bg-neutral-950 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div>
          {areas.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">{areas.join(' · ')}</p>
          )}
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl [text-wrap:balance]">
            {textos.titulo}
          </h2>
          {textos.descripcion && (
            <p className="mt-4 max-w-xl whitespace-pre-line text-base leading-relaxed text-white/75">
              {textos.descripcion}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/servicios"
              className="rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
            >
              {planes.length > 0 ? 'Ver servicios y planes' : 'Ver proyectos'}
            </Link>
            {planes.length > 0 && proyectos.length > 0 && (
              <Link
                to="/servicios#portafolio"
                className="rounded-xl border border-white/40 px-6 py-3.5 text-sm font-semibold transition hover:bg-white/10"
              >
                Ver proyectos
              </Link>
            )}
          </div>
        </div>

        {fotos.length > 0 && (
          <Link
            to={proyectos.length > 0 ? '/servicios#portafolio' : '/servicios'}
            aria-label="Ver los proyectos realizados"
            className={`grid gap-3 ${fotos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
          >
            {fotos.map((foto, i) => (
              <img
                key={foto}
                src={foto}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden';
                }}
                // Con tres fotos, la primera ocupa todo el ancho: dos arriba y
                // una abajo dejaría un hueco negro al lado.
                className={`w-full rounded-2xl bg-neutral-800 object-cover ${
                  fotos.length === 3 && i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-[4/3]'
                }`}
              />
            ))}
          </Link>
        )}
      </div>
    </section>
  );
}
