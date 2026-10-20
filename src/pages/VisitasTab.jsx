import { useEffect, useState } from 'react';
import { useCatalog } from '../context/CatalogContext.jsx';

// Cuánta gente entra a la tienda y qué mira.
//
// POR QUÉ EXISTE: el dueño no tenía forma de saber si entraba alguien. Subía
// fotos, cambiaba precios y escribía descripciones a ciegas, sin saber si
// servía de algo.
//
// Lo que esta pantalla NO hace, y lo dice claramente: no sabe QUIÉN entró.
// Un visitante es anónimo hasta que él mismo deja sus datos. Prometer otra
// cosa sería mentir, y en Perú además sería ilegal (Ley 29733).

const ORIGENES = {
  directo: 'Escribieron la dirección o la tenían guardada',
  google: 'Llegaron buscando en Google',
  facebook: 'Vinieron de Facebook',
  instagram: 'Vinieron de Instagram',
  tiktok: 'Vinieron de TikTok',
  whatsapp: 'Les pasaron el enlace por WhatsApp',
  'otro buscador': 'Llegaron desde otro buscador',
  interno: 'Navegaron dentro de la tienda',
};

function Barras({ datos, total, vacio, etiquetaDe }) {
  if (!datos.length) return <p className="text-sm text-neutral-400">{vacio}</p>;
  const mayor = Math.max(...datos.map((d) => d.visitas), 1);
  return (
    <ul className="space-y-2">
      {datos.map((d) => (
        <li key={d.nombre}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{etiquetaDe ? etiquetaDe(d.nombre) : d.nombre}</span>
            <span className="shrink-0 tabular-nums text-neutral-500">
              {d.visitas}
              {total > 0 && <span className="ml-1 text-xs">({Math.round((d.visitas / total) * 100)}%)</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-ink" style={{ width: `${(d.visitas / mayor) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function VisitasTab({ adminKey }) {
  const { products } = useCatalog();
  const [dias, setDias] = useState(30);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setDatos(null);
    fetch(`/api/visitas?dias=${dias}`, { headers: { Authorization: `Bearer ${adminKey}` } })
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setDatos(d)))
      .catch(() => setError('No se pudo cargar.'));
  }, [adminKey, dias]);

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!datos) return <p className="text-sm text-neutral-400">Cargando…</p>;

  // "/producto/milan" no le dice nada a nadie: se enseña el nombre del mueble.
  const nombrePorId = new Map(products.map((p) => [p.id, p.name]));
  const nombreDeRuta = (ruta) => {
    if (ruta === '/') return 'Portada';
    if (ruta === '/tienda') return 'Catálogo';
    if (ruta === '/carrito') return 'Carrito';
    if (ruta === '/checkout') return 'Finalizar compra';
    if (ruta === '/arma-tu-dormitorio') return 'Arma tu dormitorio';
    if (ruta === '/seguimiento') return 'Rastrear pedido';
    if (ruta.startsWith('/producto/')) {
      const id = ruta.slice('/producto/'.length);
      return nombrePorId.get(id) || id;
    }
    return ruta;
  };

  const maxDia = Math.max(...datos.porDia.map((d) => d.visitas), 1);
  const conVisitas = datos.porDia.filter((d) => d.visitas > 0).length;
  // Con pocas visitas el promedio redondeado daba "0", que se lee como "no
  // entra nadie" justo cuando sí entra alguien. Por debajo de 1 se enseña con
  // un decimal.
  const media = datos.total / datos.dias;
  const promedio = media >= 1 ? Math.round(media) : Math.round(media * 10) / 10;

  return (
    <section>
      <h2 className="text-lg font-semibold">Visitas</h2>
      <p className="mt-1 max-w-2xl text-sm text-neutral-500">
        Cuánta gente entra a tu tienda y qué mira. Se cuenta en tu propia base de datos: no
        interviene Google ni nadie más.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDias(d)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              dias === d ? 'border-ink bg-ink text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
            }`}
          >
            {d} días
          </button>
        ))}
      </div>

      {datos.total === 0 ? (
        <div className="mt-6 rounded-xl border border-neutral-200 px-6 py-10 text-center">
          <p className="text-sm font-medium">Todavía no hay visitas registradas</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            El contador empieza desde cero hoy: no puede saber quién entró antes de existir.
            Comparte el enlace de tu tienda y vuelve mañana.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Visitas</p>
              <p className="mt-1 text-xl font-semibold">{datos.total}</p>
              <p className="mt-0.5 text-xs text-neutral-500">en {datos.dias} días</p>
            </div>
            <div className="rounded-lg border border-neutral-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Por día</p>
              <p className="mt-1 text-xl font-semibold">{promedio}</p>
              <p className="mt-0.5 text-xs text-neutral-500">promedio</p>
            </div>
            <div className="rounded-lg border border-neutral-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Días con visitas</p>
              <p className="mt-1 text-xl font-semibold">{conVisitas}</p>
              <p className="mt-0.5 text-xs text-neutral-500">de {datos.dias}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-neutral-600">Día a día</h3>
            <div className="flex h-28 items-end gap-0.5 rounded-lg border border-neutral-200 p-3">
              {datos.porDia.map((d) => (
                <div
                  key={d.dia}
                  title={`${d.dia}: ${d.visitas} visita${d.visitas === 1 ? '' : 's'}`}
                  className="flex-1 rounded-t bg-ink/80 transition hover:bg-ink"
                  style={{ height: `${Math.max((d.visitas / maxDia) * 100, 2)}%` }}
                />
              ))}
            </div>
            <p className="mt-1 flex justify-between text-[11px] text-neutral-400">
              <span>{datos.porDia[0]?.dia}</span>
              <span>{datos.porDia[datos.porDia.length - 1]?.dia}</span>
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-600">Lo más visto</h3>
              <Barras
                datos={datos.rutas}
                total={datos.total}
                etiquetaDe={nombreDeRuta}
                vacio="Sin datos todavía."
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-600">De dónde llegan</h3>
              <Barras
                datos={datos.origenes}
                total={datos.total}
                etiquetaDe={(n) => ORIGENES[n] || n}
                vacio="Sin datos todavía."
              />
            </div>
          </div>
        </>
      )}

      <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
        <p>
          <strong>Esto cuenta visitas, no personas.</strong> Si alguien entra hoy y vuelve mañana,
          son dos visitas. Distinguir personas obligaría a marcar a cada una, y eso ya serían datos
          personales que habría que pedir permiso para guardar.
        </p>
        <p className="mt-2">
          <strong>Tampoco sabe quién entró</strong>, y nadie puede saberlo: un visitante es anónimo
          hasta que él mismo te deja sus datos. Para eso están los pedidos, los carritos abandonados
          y los suscriptores.
        </p>
      </div>
    </section>
  );
}
