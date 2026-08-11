import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCatalog, resolveProductImage } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { getUnitPrice } from '../lib/pricing.js';
import { fotoChica } from '../lib/fotoChica.js';
import { trackAddToCart } from '../lib/analytics.js';

// "Arma tu dormitorio": elegir cabecera + tarima + colchón de una sola vez.
//
// NO lleva descuento: el total es la SUMA de los precios de siempre. Lo que
// aporta no es rebaja, es que el cliente compre las tres piezas en una visita
// en vez de una sola — y que no tenga que adivinar qué combina con qué ni
// repetir la medida tres veces.
//
// La medida se elige UNA vez y manda para las tres piezas: una cama Queen
// necesita cabecera Queen, tarima Queen y colchón Queen. Así se evita el error
// más caro de todos, que es recibir tres cosas que no encajan entre sí.

const PASOS = [
  { cat: 'cabeceras', titulo: 'Cabecera', ayuda: 'La que va contra la pared' },
  { cat: 'tarimas', titulo: 'Tarima', ayuda: 'La base que levanta la cama' },
  { cat: 'colchones', titulo: 'Colchón', ayuda: 'Sobre la tarima' },
];

export default function ArmarDormitorio() {
  const { products, categories, sizes, colors, currencyFormatter, storeConfig } = useCatalog();
  const { addItem } = useCart();
  const navigate = useNavigate();

  // Medidas que sirven de verdad: solo las que existen en TODAS las categorías
  // del combo. Ofrecer una medida en la que no hay colchón sería mandar al
  // cliente a un callejón sin salida.
  const medidas = useMemo(
    () =>
      sizes.filter((s) =>
        PASOS.every((p) =>
          products.some((x) => !x.oculto && x.category === p.cat && x.sizePricing?.[s.id] != null)
        )
      ),
    [sizes, products]
  );

  const [medida, setMedida] = useState(null);
  const [elegido, setElegido] = useState({}); // { cabeceras: id, tarimas: id, colchones: id }
  const [colorElegido, setColorElegido] = useState(null);
  const [anadido, setAnadido] = useState(false);

  const medidaActual = medida || medidas[0]?.id;
  const tallaLabel = sizes.find((s) => s.id === medidaActual)?.label || '';

  function opciones(cat) {
    return products.filter(
      (p) => !p.oculto && p.category === cat && p.sizePricing?.[medidaActual] != null
    );
  }

  function precioDe(producto) {
    return getUnitPrice(producto, medidaActual, {})?.unitPrice ?? 0;
  }

  const seleccion = PASOS.map((p) => products.find((x) => x.id === elegido[p.cat])).filter(Boolean);
  const total = seleccion.reduce((s, p) => s + precioDe(p), 0);

  // La tarima y la cabecera van SIEMPRE del mismo color: son las dos piezas
  // tapizadas que quedan pegadas, y de distinto tono se ve como un error. Por
  // eso el color se elige una sola vez y solo se ofrecen los tonos que existen
  // en las dos: si una viene en 21 colores y la otra en 8, se ofrecen esos 8.
  const coloresDe = (producto) => {
    if (!producto || producto.tintable === false) return null;
    return producto.colorsBySize?.[medidaActual] || producto.availableColors || [];
  };
  const listasDeColor = seleccion.map(coloresDe).filter((l) => Array.isArray(l) && l.length);
  const idsComunes = listasDeColor.length
    ? listasDeColor.reduce((a, b) => a.filter((id) => b.includes(id)))
    : [];
  const coloresComunes = colors.filter((c) => idsComunes.includes(c.id));
  const colorActual = coloresComunes.some((c) => c.id === colorElegido)
    ? colorElegido
    : coloresComunes[0]?.id;
  // Con 2 o más piezas el envío va incluido (lo pidió el dueño).
  const envioIncluido = seleccion.length >= 2;

  function anadirTodo() {
    for (const producto of seleccion) {
      // El color elegido, si esta pieza lo admite. El colchón no se tiñe, así
      // que va sin color en vez de heredar uno que no existe.
      const propios = coloresDe(producto);
      const color = propios?.includes(colorActual)
        ? colors.find((c) => c.id === colorActual)
        : colors.find((c) => c.id === (propios || [])[0]);
      const img = resolveProductImage(producto, color?.id, medidaActual);
      const info = getUnitPrice(producto, medidaActual, {});
      const item = {
        productId: producto.id,
        productName: producto.name,
        baseImage: img.src,
        tintable: img.tintable,
        sizeId: medidaActual,
        colorId: color?.id,
        opciones: {},
        opcionesDetalle: info?.detalle || [],
        qty: 1,
        unitPrice: info?.unitPrice ?? 0,
      };
      addItem(item);
      trackAddToCart(item);
    }
    setAnadido(true);
    setTimeout(() => navigate('/carrito'), 700);
  }

  if (!medidas.length) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Arma tu dormitorio</h1>
        <p className="mt-3 text-neutral-500">
          Todavía no hay una medida con cabecera, tarima y colchón a la vez. Escríbenos y te lo
          armamos a medida.
        </p>
        <Link to="/tienda" className="mt-6 inline-block rounded-lg border border-neutral-300 px-6 py-2.5 text-sm font-medium hover:border-ink">
          Ver el catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 pb-40">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Arma tu dormitorio</h1>
      <p className="mt-2 max-w-2xl text-neutral-500">
        Elige tu medida y las piezas que quieras. Cada una va a su precio de siempre, y{' '}
        <strong className="text-neutral-700">desde 2 piezas el envío en Lima va incluido</strong>.
      </p>

      {/* Paso 0: la medida, una sola vez para las tres piezas */}
      <section className="mt-8">
        <p className="mb-2 text-sm font-medium text-neutral-700">
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">1</span>
          ¿De qué medida es tu cama?
        </p>
        <div className="flex flex-wrap gap-2">
          {medidas.map((s) => (
            <button
              key={s.id}
              onClick={() => { setMedida(s.id); setElegido({}); }}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                medidaActual === s.id ? 'border-ink bg-ink text-white' : 'border-neutral-300 hover:border-neutral-500'
              }`}
            >
              <span className="block font-medium">{s.label}</span>
              {s.dims && <span className="block text-xs opacity-70">{s.dims}</span>}
            </button>
          ))}
        </div>
      </section>

      {/* Pasos 1-3: una fila por pieza */}
      {PASOS.map((paso, i) => {
        const lista = opciones(paso.cat);
        const etiqueta = categories.find((c) => c.id === paso.cat)?.label || paso.titulo;
        if (!lista.length) return null;
        return (
          <section key={paso.cat} className="mt-10">
            <p className="mb-1 text-sm font-medium text-neutral-700">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">{i + 2}</span>
              {paso.titulo}
              <span className="ml-2 font-normal text-neutral-400">{paso.ayuda}</span>
            </p>
            <p className="mb-3 pl-7 text-xs text-neutral-400">
              {lista.length} {etiqueta.toLowerCase()} en {tallaLabel} · puedes saltarte este paso
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {lista.map((p) => {
                const activo = elegido[paso.cat] === p.id;
                const color = colors.find((c) => c.id === (p.availableColors || [])[0]);
                const img = resolveProductImage(p, color?.id, medidaActual);
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      setElegido((prev) => ({ ...prev, [paso.cat]: activo ? undefined : p.id }))
                    }
                    className={`w-36 shrink-0 overflow-hidden rounded-xl border text-left transition ${
                      activo ? 'border-ink ring-2 ring-ink' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <img
                      loading="lazy"
                      src={fotoChica(img.src)}
                      alt={p.name}
                      className="h-24 w-full bg-neutral-50 object-contain"
                    />
                    <span className="block px-2 py-2">
                      <span className="block truncate text-xs font-medium">{p.name}</span>
                      <span className="block text-xs text-neutral-500">
                        {currencyFormatter.format(precioDe(p))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* El color, una sola vez para todo lo tapizado */}
      {coloresComunes.length > 0 && (
        <section className="mt-10">
          <p className="mb-1 text-sm font-medium text-neutral-700">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">5</span>
            Color
            <span className="ml-2 font-normal text-neutral-400">
              {colors.find((c) => c.id === colorActual)?.label}
            </span>
          </p>
          <p className="mb-3 pl-7 text-xs text-neutral-500">
            La cabecera y la tarima van <strong>del mismo color</strong>: son las dos piezas
            tapizadas que quedan juntas.
          </p>
          <div className="flex flex-wrap gap-3 pl-7">
            {coloresComunes.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                aria-label={c.label}
                onClick={() => setColorElegido(c.id)}
                className={`h-9 w-9 overflow-hidden rounded-full border bg-cover bg-center transition ring-offset-2 ${
                  colorActual === c.id ? 'ring-2 ring-ink' : 'ring-0 border-neutral-300'
                }`}
                style={c.img ? { backgroundImage: `url(${c.img})` } : { backgroundColor: c.hex }}
              />
            ))}
          </div>
          {listasDeColor.length > 1 && (
            <p className="mt-2 pl-7 text-xs text-neutral-400">
              Se muestran los {coloresComunes.length} colores que existen en las dos piezas.
            </p>
          )}
        </section>
      )}

      {/* Resumen fijo abajo: el total siempre a la vista mientras elige */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-neutral-500">
              {seleccion.length === 0
                ? `Elige tus piezas en ${tallaLabel}`
                : seleccion.map((p) => p.name).join(' + ')}
            </p>
            <p className="text-lg font-semibold">
              {currencyFormatter.format(total)}
              <span className="ml-2 text-xs font-normal text-neutral-400">
                {seleccion.length} {seleccion.length === 1 ? 'pieza' : 'piezas'} · {tallaLabel}
                {colorActual && seleccion.some((p) => coloresDe(p)?.length)
                  ? ` · ${colors.find((c) => c.id === colorActual)?.label}`
                  : ''}
              </span>
            </p>
            {envioIncluido ? (
              <p className="text-xs font-medium text-emerald-700">🚚 Envío incluido en Lima</p>
            ) : (
              seleccion.length === 1 && (
                <p className="text-xs text-neutral-500">
                  Suma una pieza más y el <strong>envío en Lima va incluido</strong>
                </p>
              )
            )}
          </div>
          <button
            onClick={anadirTodo}
            disabled={seleccion.length === 0 || anadido}
            className="rounded-lg bg-ink px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {anadido ? '✓ Añadido' : `Añadir ${seleccion.length || ''} al carrito`}
          </button>
        </div>
      </div>

      <p className="mt-8 text-xs text-neutral-400">
        Los precios son los mismos del catálogo; aquí no se suma ningún cargo.
        {storeConfig.leadTime ? ` Entrega en ${storeConfig.leadTime}.` : ''}
      </p>
    </main>
  );
}
