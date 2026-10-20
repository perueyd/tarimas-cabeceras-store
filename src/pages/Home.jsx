import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { usarMeta } from '../lib/meta.js';

export default function Home() {
  const { categories, products, storeConfig, sizes } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  // La categoría se deriva SIEMPRE de la dirección, no de un estado aparte.
  // Con un useState que solo leía la URL al montar, el botón "Atrás" del
  // navegador y el enlace "Tienda" del menú cambiaban la dirección pero
  // dejaban la lista filtrada como estaba: parecía que faltaban productos.
  const tab = searchParams.get('categoria') || 'todos';
  // Filtro por medida de cama. Quien compra un mueble de dormitorio YA sabe si
  // su cama es de 2 plazas o Queen: filtrar por eso le ahorra abrir producto
  // por producto para ver si le sirve, y de paso le muestra el precio de SU
  // medida en vez de un "desde" que corresponde al tamaño más chico.
  const plaza = searchParams.get('plaza') || 'todas';
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

  // Los productos que quedan al aplicar SOLO la categoría y la búsqueda. De
  // aquí salen las medidas que se ofrecen: no tiene sentido mostrar "King" si
  // en la categoría que está mirando no hay nada en King.
  const porCategoria = products.filter((p) => {
    if (p.oculto) return false; // borradores no se muestran a los clientes
    const enCategoria = tab === 'todos' || p.category === tab;
    if (!q) return enCategoria;
    const texto = normaliza(`${p.name} ${p.shortDescription || ''}`);
    return enCategoria && texto.includes(q);
  });

  const MEDIDAS = sizes.filter((s) => porCategoria.some((p) => p.sizePricing?.[s.id] != null));
  const visibleProducts = porCategoria.filter(
    (p) => plaza === 'todas' || p.sizePricing?.[plaza] != null
  );

  // Se conserva lo que ya estaba elegido: cambiar de categoría no debe borrar
  // la medida, ni al revés.
  function irA(cambios) {
    const params = {};
    const cat = 'categoria' in cambios ? cambios.categoria : tab;
    const med = 'plaza' in cambios ? cambios.plaza : plaza;
    if (cat && cat !== 'todos') params.categoria = cat;
    if (med && med !== 'todas') params.plaza = med;
    setSearchParams(params);
  }
  const selectTab = (id) => irA({ categoria: id });

  // "Cabeceras a tu medida" en vez del mismo título para todo el catálogo:
  // alguien que busca "cabeceras Lima" debe encontrar ESTA página, no la
  // portada genérica.
  const nombreCategoria = tab === 'todos' ? 'Muebles' : categories.find((c) => c.id === tab)?.label || 'Muebles';
  const nombreMedida = plaza === 'todas' ? '' : sizes.find((s) => s.id === plaza)?.label || '';
  usarMeta({
    titulo: `${nombreCategoria}${nombreMedida ? ` ${nombreMedida}` : ''} a tu medida`,
    descripcion: `${nombreCategoria} a medida en Perú${nombreMedida ? ` para cama ${nombreMedida}` : ''}. Elige tamaño y color, y visualiza el cambio al instante. Envíos a todo el Perú.`,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {/* En móvil este encabezado se comía media pantalla antes del primer
          mueble, así que va más justo ahí y respira en pantallas grandes. */}
      <section className="mb-6 sm:mb-10">
        <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">
          {(tab === 'todos' ? 'Muebles' : categories.find((c) => c.id === tab)?.label || 'Muebles')} a tu medida
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-neutral-500 sm:mt-2 sm:text-base">
          Elige el tamaño y el color, y visualiza el cambio al instante. Envíos a todo el Perú.
        </p>
      </section>

      {/* Antes aquí había SEIS bloques apilados — título, párrafo, banner del
          armador, buscador, categorías y medidas — y el cliente tenía que
          pasarlos todos antes de ver un solo mueble. Quien entra a una tienda
          de muebles quiere ver muebles.

          Ahora los filtros son una sola fila discreta, y las medidas solo
          aparecen cuando el cliente ya eligió una categoría: preguntarle el
          tamaño de su cama antes de saber si quiere cabecera o tarima es
          preguntar demasiado pronto. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
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

        <div className="relative ml-auto w-full sm:w-56">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar mueble"
            className="w-full rounded-full border border-neutral-300 py-1.5 pl-9 pr-3 text-sm outline-none transition focus:border-ink"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            ⌕
          </span>
        </div>
      </div>

      {MEDIDAS.length > 1 && tab !== 'todos' && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-400">Medida:</span>
          <button
            onClick={() => irA({ plaza: 'todas' })}
            className={`rounded-full px-3 py-1 transition ${
              plaza === 'todas' ? 'bg-neutral-100 font-medium text-ink' : 'text-neutral-500 hover:text-ink'
            }`}
          >
            Todas
          </button>
          {MEDIDAS.map((s) => (
            <button
              key={s.id}
              onClick={() => irA({ plaza: s.id })}
              className={`rounded-full px-3 py-1 transition ${
                plaza === s.id ? 'bg-neutral-100 font-medium text-ink' : 'text-neutral-500 hover:text-ink'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {visibleProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((p) => (
            <ProductCard key={p.id} product={p} sizeId={plaza === 'todas' ? null : plaza} />
          ))}
        </div>
      ) : plaza !== 'todas' ? (
        <div className="rounded-xl border border-neutral-200 bg-white px-6 py-14 text-center">
          <p className="text-lg font-medium">
            Nada en {sizes.find((s) => s.id === plaza)?.label || 'esa medida'} por aquí 📐
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Prueba con otra medida, o escríbenos: casi todo lo hacemos a la medida que necesites.
          </p>
          <button
            onClick={() => irA({ plaza: 'todas' })}
            className="mt-6 rounded-lg border border-neutral-300 px-6 py-2.5 text-sm font-medium transition hover:border-ink"
          >
            Ver todas las medidas
          </button>
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

      {/* El armador estaba ARRIBA del catálogo, empujando los muebles fuera de
          la primera pantalla. Pero quien acaba de entrar todavía no sabe qué
          quiere: ofrecerle el paquete de tres piezas antes de que vea una sola
          es demasiado pronto.

          Aquí abajo llega justo a quien ya recorrió el catálogo — que es quien
          de verdad puede querer el dormitorio completo. */}
      {visibleProducts.length > 0 && (
        <Link
          to="/arma-tu-dormitorio"
          className="mt-12 flex items-center justify-between gap-4 rounded-xl border border-neutral-200 px-5 py-4 transition hover:border-ink"
        >
          <span>
            <span className="block text-sm font-medium">Arma tu dormitorio completo</span>
            <span className="block text-xs text-neutral-500">
              Cabecera, tarima y colchón de tu medida, en un solo paso
            </span>
          </span>
          <span className="shrink-0 text-sm text-neutral-400">→</span>
        </Link>
      )}
    </main>
  );
}
